// src/hooks/useRoles.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { roleService } from '../services/roleService';

import { toast } from 'react-hot-toast';

export const useRoles = () => {
  const queryClient = useQueryClient();

  // Obtener todos los roles
  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: roleService.getRoles,
  });

  // Obtener todos los permisos
  const permissionsQuery = useQuery({
    queryKey: ['permissions'],
    queryFn: roleService.getPermissions,
  });

  // Crear rol
  const createRoleMutation = useMutation({
    mutationFn: roleService.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rol creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al crear el rol');
    },
  });

  // Actualizar rol
  const updateRoleMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      roleService.updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rol actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al actualizar el rol');
    },
  });

  // Eliminar rol
  const deleteRoleMutation = useMutation({
    mutationFn: roleService.deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Rol eliminado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al eliminar el rol');
    },
  });

  return {
    roles: rolesQuery.data || [],
    agencyRoles: (rolesQuery.data || []).filter(role => role.type === 1),
    permissions: permissionsQuery.data || [],
    isLoading: rolesQuery.isLoading || permissionsQuery.isLoading,
    createRole: createRoleMutation.mutate,
    updateRole: updateRoleMutation.mutate,
    deleteRole: deleteRoleMutation.mutate,
    isCreating: createRoleMutation.isPending,
    isUpdating: updateRoleMutation.isPending,
    isDeleting: deleteRoleMutation.isPending,
  };
};
