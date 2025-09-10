// Ambient type declarations for expo-secure-store to satisfy TS in projects
// where the module may not be installed or its types are not resolved at build time.
// This mirrors the minimal API surface used in the app (setItemAsync, getItemAsync, deleteItemAsync)
// and adds isAvailableAsync for completeness.

declare module 'expo-secure-store' {
    export interface SecureStoreOptions {
        keychainService?: string;
        requireAuthentication?: boolean;
        authenticationPrompt?: string;
        keychainAccessible?: any; // platform-specific; keep as any for ambient typing
    }

    /**
     * Returns whether SecureStore is available on the current device/platform.
     */
    export function isAvailableAsync(): Promise<boolean>;

    /**
     * Save a string value under the given key.
     */
    export function setItemAsync(
        key: string,
        value: string,
        options?: SecureStoreOptions
    ): Promise<void>;

    /**
     * Retrieve a string value for the given key. Returns null if not found.
     */
    export function getItemAsync(
        key: string,
        options?: SecureStoreOptions
    ): Promise<string | null>;

    /**
     * Delete the value for the given key.
     */
    export function deleteItemAsync(
        key: string,
        options?: SecureStoreOptions
    ): Promise<void>;
}
