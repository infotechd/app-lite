import Toast from 'react-native-toast-message';

interface ToastOptions {
    type?: 'success' | 'error' | 'info';
    title?: string;
    message: string;
    duration?: number;
}

export const useToast = () => {
    const showToast = ({
                           type = 'info',
                           title,
                           message,
                           duration = 3000
                       }: ToastOptions) => {
        Toast.show({
            type,
            text1: title,
            text2: message,
            visibilityTime: duration,
            autoHide: true,
            topOffset: 60,
        });
    };

    const showSuccess = (message: string, title?: string) => {
        showToast({ type: 'success', title, message });
    };

    const showError = (message: string, title?: string) => {
        showToast({ type: 'error', title, message });
    };

    const showInfo = (message: string, title?: string) => {
        showToast({ type: 'info', title, message });
    };

    return {
        showToast,
        showSuccess,
        showError,
        showInfo,
    };
};