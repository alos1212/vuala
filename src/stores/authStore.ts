// src/stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import type { Permission, User } from '../types/auth';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    permissions: string[];
    login: (user: User, token: string) => void;
    logout: () => void;
    updateUser: (user: User) => void;
    hasPermission: (permission: string) => boolean;
    hasRole: (roleName: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            permissions: [],

            login: (user, token) => {
                console.log(user);

                let permissions: string[] = [];
                if (Array.isArray(user.role)) {
                    // Si es array
                    if (user.role[0] && user.role[1]) {
                        // Tiene al menos dos roles
                        permissions = user.role.flatMap(role =>
                            role.permissions.map(p => p.name)
                        );
                    } else if (user.role[0]) {
                        // Solo un rol
                        permissions = user.role[0].permissions.map(p => p.name);
                    }
                } else if (user.role) {
                    const role = user.role as { id: number; name: string; permissions: Permission[] };
                    permissions = role.permissions.map(p => p.name);
                }
                console.log("paso esto");
                console.log(permissions);
                Cookies.set('auth_token', token);
                 Cookies.set('auth_tokens', token);
                set({
                    user,
                    token,
                    isAuthenticated: true,
                    permissions: permissions ?? []
                });
            },

            logout: () => {
                Cookies.remove('auth_token');
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    permissions: []
                });
            },

            updateUser: (user) => {

                let permissions: string[] = [];
                if (Array.isArray(user.role)) {
                    // Si es array
                    if (user.role[0] && user.role[1]) {
                        // Tiene al menos dos roles
                        permissions = user.role.flatMap(role =>
                            role.permissions.map(p => p.name)
                        );
                    } else if (user.role[0]) {
                        // Solo un rol
                        permissions = user.role[0].permissions.map(p => p.name);
                    }
                } else if (user.role) {
                    const role = user.role as { id: number; name: string; permissions: Permission[] };
                    permissions = role.permissions.map(p => p.name);
                }
                set({ user, permissions: permissions ?? [] });
            },

            hasPermission: (permission) => {
                const permissions = get().permissions;
                if (!Array.isArray(permissions)) return false;
                return permissions.includes(permission);
            },

            hasRole: (roleName) => {
                const user = get().user;
                let hasRoleId1 = false;
                let hasRoleName = false;

                if (Array.isArray(user?.role)) {
                    hasRoleId1 = user.role.some(r => r.id === 1);
                    hasRoleName = user.role.some(role => role.name === roleName);
                } else if (user?.role) {
                    let role = user.role as { id: number; name: string };
                    hasRoleId1 = role.id === 1;
                    hasRoleName = role.name === roleName;
                }
                return !!(hasRoleId1 || hasRoleName);
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
                permissions: state.permissions
            }),
        }
    )
);
