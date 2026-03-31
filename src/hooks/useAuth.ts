import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import React from 'react';

export const useAuth = () => {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const {
        login: loginStore,
        logout: logoutStore,
        updateUser,
        user,
        isAuthenticated,
        hasPermission,
        hasRole
    } = useAuthStore();

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: authService.login,
        onSuccess: (data) => {
            console.log(data);
            loginStore(data.user, data?.access_token);
            toast.success(`¡Bienvenido, ${data.user.name}!`);
            navigate('/dashboard');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Error al iniciar sesión';
            toast.error(message);
        },
    });

    // Register mutation
    const registerMutation = useMutation({
        mutationFn: authService.register,
        onSuccess: (data) => {
            loginStore(data.user, data.access_token);
            toast.success(`¡Bienvenido, ${data.user.name}! Tu cuenta ha sido creada.`);
            navigate('/dashboard');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Error al registrarse';
            toast.error(message);
        },
    });

    // Logout mutation
    const logoutMutation = useMutation({
        mutationFn: authService.logout,
        onSuccess: () => {
            logoutStore();
            queryClient.clear();
            toast.success('Sesión cerrada correctamente');
            navigate('/login');
        },
        onError: () => {
            // Logout local even if server request fails
            logoutStore();
            queryClient.clear();
            navigate('/login');
        },
    });

    // Get profile query
    const profileQuery = useQuery({
        queryKey: ['profile'],
        queryFn: authService.getProfile,
        enabled: isAuthenticated,
        retry: 1,
        refetchOnWindowFocus: false,
    });

    // Handle profile query side effects
    React.useEffect(() => {
        if (profileQuery.isSuccess && profileQuery.data) {
            updateUser(profileQuery.data);
        }
        if (profileQuery.isError) {
            logoutStore();
        }
    }, [profileQuery.isSuccess, profileQuery.isError, profileQuery.data, updateUser, logoutStore]);

    // Update profile mutation
    const updateProfileMutation = useMutation({
        mutationFn: authService.updateProfile,
        onSuccess: (data: any) => {
            updateUser(data);
            queryClient.setQueryData(['profile'], data);
            toast.success('Perfil actualizado correctamente');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Error al actualizar el perfil';
            toast.error(message);
        },
    });

    // Change password mutation
    const changePasswordMutation = useMutation({
        mutationFn: authService.changePassword,
        onSuccess: () => {
            toast.success('Contraseña actualizada correctamente');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Error al cambiar la contraseña';
            toast.error(message);
        },
    });

    return {
        // State
        user,
        isAuthenticated,

        // Actions
        login: loginMutation.mutateAsync,
        register: registerMutation.mutateAsync,
        logout: logoutMutation.mutate,
        updateProfile: updateProfileMutation.mutateAsync,
        changePassword: changePasswordMutation.mutate,

        // Loading states
        isLoading: loginMutation.isPending || registerMutation.isPending,
        isLogoutLoading: logoutMutation.isPending,
        isProfileLoading: profileQuery.isLoading,
        isUpdatingProfile: updateProfileMutation.isPending,
        isChangingPassword: changePasswordMutation.isPending,

        // Profile data
        profile: profileQuery.data,

        // Permissions
        hasPermission,
        hasRole,

        // Refetch profile
        refetchProfile: profileQuery.refetch,
    };
};
