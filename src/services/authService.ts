// src/services/authService.ts
import api from '../lib/axios';
import type { ApiResponse } from '../types/api';
import type {
    LoginRequest,
    RegisterRequest,
    AuthResponse,
    User,
    ForgotPasswordRequest,
    ResetPasswordRequest
} from '../types/auth';


export const authService = {
    login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    
        const response = await api.post<ApiResponse<AuthResponse>>('/login', credentials);
        return response.data.data;
    },

    register: async (userData: RegisterRequest): Promise<AuthResponse> => {
        const response = await api.post<ApiResponse<AuthResponse>>('/register', userData);
        return response.data.data;
    },

    logout: async (): Promise<void> => {
        await api.post('/logout');
    },

    getProfile: async (): Promise<User> => {
        const response = await api.get<ApiResponse<User>>('/profile');
        return response.data.data;
    },

    updateProfile: async (userData: Partial<User> | FormData): Promise<User> => {
        const response = userData instanceof FormData
            ? await (() => {
                if (!userData.has('_method')) {
                    userData.append('_method', 'PUT');
                }
                return api.post<ApiResponse<User>>('/profile', userData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
            })()
            : await api.put<ApiResponse<User>>('/profile', userData);
        return response.data.data;
    },

    changePassword: async (passwords: {
        current_password: string;
        password: string;
        password_confirmation: string;
    }): Promise<void> => {
        await api.put('/change-password', passwords);
    },

    forgotPassword: async (payload: ForgotPasswordRequest): Promise<string> => {
        const response = await api.post('/forgot-password', payload);
        return response?.data?.message || 'Solicitud enviada correctamente';
    },

    resetPassword: async (payload: ResetPasswordRequest): Promise<string> => {
        const response = await api.post('/reset-password', payload);
        return response?.data?.message || 'La contraseña fue restablecida correctamente';
    },
};
