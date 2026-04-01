// src/types/auth.ts
export interface User {
    id: number;
    name: string;
    first_name?: string | null;
    last_name?: string | null;
    email: string;
    phone?: string | null;
    email_verified_at?: string;
    avatar?: string;
    avatar_url?: string | null;
    birthdate?: string | null;
    birth_date?: string | null;
    gender?: 'M' | 'F' | null;
    status: 'active' | 'inactive';
    role: Role[];
    company_id?: number | null;
    company?: {
        id?: number;
        name?: string;
    } | null;
    created_at: string;
    updated_at: string;
}

export interface Role {
    id: number;
    name: string;
    display_name: string;
    description?: string;
    type: 0 | 1 | 2;
    permissions: Permission[];
    created_at: string;
    updated_at: string;
}

export interface Permission {
    id: number;
    name: string;
    display_name: string;
    description?: string;
    group: string;
    created_at: string;
    updated_at: string;
}

export interface LoginRequest {
    email: string;
    password: string;
    remember_me?: boolean;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
}

export interface ForgotPasswordRequest {
    email: string;
    return_url?: string;
    requested_from?: string;
}

export interface ResetPasswordRequest {
    email: string;
    token: string;
    password: string;
    password_confirmation: string;
}

export interface AuthResponse {
    user: User;
    access_token: string;
    expires_in?: number;
}
