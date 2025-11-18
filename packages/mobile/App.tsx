import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from '@/context/AuthContext';
import { lightTheme, darkTheme } from '@/styles/theme';
import { navigationRef } from '@/navigation/RootNavigation';
import { initSentry } from '@/utils/sentry';
import { DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme } from '@react-navigation/native';

const App: React.FC = () => {
    const colorScheme = useColorScheme();
    const paperTheme = colorScheme === 'dark' ? darkTheme : lightTheme;
    const navigationTheme = colorScheme === 'dark' ? NavigationDarkTheme : NavigationDefaultTheme;
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
                </AuthProvider>
            </SafeAreaProvider>
        </PaperProvider>
    );
};

export default App;
