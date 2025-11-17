import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from '@/context/AuthContext';
import { theme } from '@/styles/theme';
import { navigationRef } from '@/navigation/RootNavigation';
import { initSentry } from '@/utils/sentry';

const App: React.FC = () => {
    useEffect(() => {
        // Inicializa Sentry assim que o app sobe. Se DSN não estiver setado, será no-op.
        initSentry();
    }, []);
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
