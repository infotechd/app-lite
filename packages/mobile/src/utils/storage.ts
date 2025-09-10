import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '@/constants/config';

class StorageService {
    // Salvar token de autenticação
    async saveAuthToken(token: string): Promise<void> {
        try {
            await SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
        } catch (error) {
            console.error('Erro ao salvar token:', error);
            throw new Error('Falha ao salvar credenciais');
        }
    }

    // Obter token de autenticação
    async getAuthToken(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
        } catch (error) {
            console.error('Erro ao obter token:', error);
            return null;
        }
    }

    // Remover token de autenticação
    async removeAuthToken(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
        } catch (error) {
            console.error('Erro ao remover token:', error);
        }
    }

    // Salvar dados do usuário
    async saveUserData(userData: string): Promise<void> {
        try {
            await SecureStore.setItemAsync(STORAGE_KEYS.USER_DATA, userData);
        } catch (error) {
            console.error('Erro ao salvar dados do usuário:', error);
        }
    }

    // Obter dados do usuário
    async getUserData(): Promise<string | null> {
        try {
            return await SecureStore.getItemAsync(STORAGE_KEYS.USER_DATA);
        } catch (error) {
            console.error('Erro ao obter dados do usuário:', error);
            return null;
        }
    }

    // Remover dados do usuário
    async removeUserData(): Promise<void> {
        try {
            await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
        } catch (error) {
            console.error('Erro ao remover dados do usuário:', error);
        }
    }

    // Limpar todos os dados
    async clearAll(): Promise<void> {
        try {
            await Promise.all([
                this.removeAuthToken(),
                this.removeUserData(),
            ]);
        } catch (error) {
            console.error('Erro ao limpar dados:', error);
        }
    }
}

export const storageService = new StorageService();