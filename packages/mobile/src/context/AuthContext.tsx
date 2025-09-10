import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '@/services/authService';
import { setAuthToken, clearAuthToken } from '@/services/api';
import { User, AuthContextType, RegisterData, PendingRedirect } from '@/types';
import { navigationRef } from '@/navigation/RootNavigation';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [pendingRedirect, setPendingRedirect] = useState<PendingRedirect | null>(null);

    const isAuthenticated = !!user && !!token;

    useEffect(() => {
        void loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
        try {
            const [storedToken, storedUser] = await Promise.all([
                AsyncStorage.getItem('token'),
                AsyncStorage.getItem('user'),
            ]);

            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
                // Configura o token no cliente HTTP
                setAuthToken(storedToken);
            } else {
                clearAuthToken();
            }
        } catch (error) {
            console.error('Erro ao carregar autenticação:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Consolidated post-authentication handler to avoid duplication between login and register
    const handleAuthSuccess = async (
        response: { token: string; user: User },
        nextRedirect: PendingRedirect | null
    ) => {
        // Persist token and user
        await AsyncStorage.setItem('token', response.token);
        await AsyncStorage.setItem('user', JSON.stringify(response.user));

        // Update local state and HTTP client
        setToken(response.token);
        setUser(response.user);
        setAuthToken(response.token);

        // Handle any pending navigation redirect then clear it
        if (nextRedirect && navigationRef.isReady()) {
            try {
                // Use an untyped navigate to satisfy TS while keeping runtime behavior
                // This accommodates our global navigation ref without strict route typing
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (navigationRef as any)?.navigate(
                    nextRedirect.routeName,
                    nextRedirect.params ?? {}
                );
            } catch (e) {
                // noop
            } finally {
                setPendingRedirect(null);
            }
        }
    };

    const login = async (email: string, password: string) => {
        try {
            setIsLoading(true);
            const response = await authService.login({ email, password });

            await handleAuthSuccess(response, pendingRedirect);
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (data: RegisterData) => {
        try {
            setIsLoading(true);
            const response = await authService.register(data);

            await handleAuthSuccess(response, pendingRedirect);
        } catch (error) {
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Erro no logout:', error);
        } finally {
            // Limpa token do cliente HTTP e storage
            clearAuthToken();
            await AsyncStorage.multiRemove(['token', 'user']);
            setToken(null);
            setUser(null);
        }
    };

    const clearPendingRedirect = () => setPendingRedirect(null);

    const value: AuthContextType = {
        user,
        token,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        pendingRedirect,
        setPendingRedirect,
        clearPendingRedirect,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth deve ser usado dentro de AuthProvider');
    }
    return context;
};

export { AuthContext };
export default AuthContext;