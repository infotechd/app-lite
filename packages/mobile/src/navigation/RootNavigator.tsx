import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '@/context/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import LoadingScreen from '../screens/LoadingScreen';
import { RootStackParamList } from '@/types';
import { ROOT_ROUTES } from '@/navigation/RootNavigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator: React.FC = () => {
    const { isLoading } = useAuth();

    if (isLoading) {
        return <LoadingScreen />;
    }

    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name={ROOT_ROUTES.Main} component={MainTabNavigator} />
            <Stack.Screen name={ROOT_ROUTES.Auth} component={AuthNavigator} options={{ presentation: 'modal' }} />
        </Stack.Navigator>
    );
};

export default RootNavigator;