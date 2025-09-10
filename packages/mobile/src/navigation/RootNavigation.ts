import { createNavigationContainerRef } from '@react-navigation/native';

// Centralized naming for root stack routes to avoid magic strings
export const ROOT_ROUTES = {
    Main: 'Main' as const,
    Auth: 'Auth' as const,
};

// Global ref to the NavigationContainer
export const navigationRef = createNavigationContainerRef<any>();

// Helper to open the Auth flow from anywhere without knowing the tree structure
export type AuthTarget = { screen?: 'Login' | 'Register' };
export function openAuthModal(target?: AuthTarget) {
    try {
        if (navigationRef.isReady()) {
            // Use untyped navigate to avoid TS inference issues with root ref
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (navigationRef as any)?.navigate(ROOT_ROUTES.Auth, target ?? {});
        }
    } catch {
        // noop: best-effort navigation
    }
}

export default {
    navigationRef,
    ROOT_ROUTES,
    openAuthModal,
};
