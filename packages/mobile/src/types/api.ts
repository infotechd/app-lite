// Tipos de resposta da API padronizados para o app mobile
// Segue as guidelines do projeto

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    message: string;
    error?: string;
}
