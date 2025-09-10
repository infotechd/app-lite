import React, { useEffect } from 'react';
import { useRoute } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { openAuthModal } from '@/navigation/RootNavigation';

interface RequireAuthProps {
    children: React.ReactElement;
    authTarget?: { screen?: 'Login' | 'Register' };
    redirectToAfterLogin?: { routeName: string; params?: any };
}

// Auth gate: if not authenticated, open Auth modal globally and set optional pending redirect
const RequireAuth: React.FC<RequireAuthProps> = ({ children, authTarget, redirectToAfterLogin }) => {
    const { isAuthenticated, setPendingRedirect, pendingRedirect } = useAuth();
    const route = useRoute<any>();

    useEffect(() => {
        if (!isAuthenticated) {
            // Set pending redirect only if not already set
            const target = redirectToAfterLogin ?? { routeName: route.name as string, params: route.params };
            if (!pendingRedirect) {
                setPendingRedirect(target);
            }
            openAuthModal(authTarget);
        }
    }, [isAuthenticated, authTarget, redirectToAfterLogin, route, setPendingRedirect, pendingRedirect]);

    if (!isAuthenticated) return null;
    return children;
};

export default RequireAuth;
