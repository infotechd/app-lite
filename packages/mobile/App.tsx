import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { GlobalDialog } from './src/components/common/GlobalDialog';
import { AuthProvider } from '@/context/AuthContext';
// import { lightTheme, darkTheme } from '@/styles/theme';
import { lightTheme } from '@/styles/theme';
import { navigationRef } from '@/navigation/RootNavigation';
import { initSentry } from '@/utils/sentry';
import { DefaultTheme as NavigationDefaultTheme } from '@react-navigation/native';

const App: React.FC = () => {
    // Desativado detecção de esquema de cores para manter apenas Light Theme
    // const colorScheme = useColorScheme();
    const paperTheme = lightTheme;
    const navigationTheme = NavigationDefaultTheme;
    useEffect(() => {
        // Inicializa Sentry assim que o app sobe. Se DSN não estiver setado, será no-op.
        initSentry();
    }, []);
    return (
        <PaperProvider theme={paperTheme}>
            <SafeAreaProvider>
                <AuthProvider>
                    <NavigationContainer theme={navigationTheme} ref={navigationRef}>
                        <RootNavigator />
                    </NavigationContainer>
                    <GlobalDialog />
                </AuthProvider>
            </SafeAreaProvider>
        </PaperProvider>
    );
};

export default App;
