import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from '@/context/AuthContext';
import { theme } from '@/styles/theme';
import { navigationRef } from '@/navigation/RootNavigation';

const App: React.FC = () => {
    return (
        <PaperProvider theme={theme}>
            <SafeAreaProvider>
                <AuthProvider>
                    <NavigationContainer ref={navigationRef}>
                        <RootNavigator />
                    </NavigationContainer>
                </AuthProvider>
            </SafeAreaProvider>
        </PaperProvider>
    );
};

export default App;
