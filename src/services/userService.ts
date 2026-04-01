// src/services/userService.ts
import api from '../lib/axios';
import type { User } from '../types/auth';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { UserPointsData, UserProfileWithPoints } from '../types/userPoints';

export const userService = {
    getUsers: async (params?: {
        page?: number;
        per_page?: number;
        search?: string;
        role?: string;
        status?: string;
        company_id?: number;
    }): Promise<PaginatedResponse<User>> => {
        const response = await api.get<PaginatedResponse<User>>('/users', { params });
        return response.data;
    },

    getUser: async (id: number): Promise<User> => {
        const response = await api.get<ApiResponse<User>>(`/users/${id}`);
        return response.data.data;
    },

    createUser: async (userData: {
        name: string;
        email: string;
        password: string;
        password_confirmation: string;
        company_id?: number | null;
        roles?: number[];
        status?: 'active' | 'inactive';
        birthdate?: string;
        birth_date?: string;
        gender?: 'M' | 'F';
    }): Promise<User> => {
        const response = await api.post<ApiResponse<User>>('/users', userData);
        return response.data.data;
    },

    updateUser: async (id: number, userData: Partial<User> & { roles?: number[]; company_id?: number | null }): Promise<User> => {
        const response = await api.put<ApiResponse<User>>(`/users/${id}`, userData);
        return response.data.data;
    },

    deleteUser: async (id: number): Promise<void> => {
        await api.delete(`/users/${id}`);
    },

    updateUserStatus: async (id: number, _status?: 'active' | 'inactive'): Promise<User> => {
        const response = await api.put<ApiResponse<User>>(`/users/${id}/toggle-status`);
        return response.data.data;
    },

    getMyProfilePoints: async (params?: { page?: number; per_page?: number }): Promise<UserPointsData> => {
        const response = await api.get<ApiResponse<UserPointsData>>('/profile/points', { params });
        return response.data.data;
    },

    getUserProfileWithPoints: async (
        id: number,
        params?: { page?: number; per_page?: number }
    ): Promise<UserProfileWithPoints> => {
        const response = await api.get<ApiResponse<UserProfileWithPoints>>(`/users/${id}/profile`, { params });
        return response.data.data;
    },
}; 
