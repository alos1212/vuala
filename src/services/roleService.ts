// src/services/roleService.ts
import api from '../lib/axios';
import type { Role, Permission } from '../types/auth';
import type { ApiResponse } from '../types/api';

export const roleService = {
  getRoles: async (): Promise<Role[]> => {
    const response = await api.get<ApiResponse<Role[]>>('/roles');
    return response.data.data;
  },

  getRole: async (id: number): Promise<Role> => {
    const response = await api.get<ApiResponse<Role>>(`/roles/${id}`);
    return response.data.data;
  },

  createRole: async (roleData: {
    name: string;
    display_name: string;
    description?: string;
    type: 0 | 1 | 2;
    permissions: number[];
  }): Promise<Role> => {
    const response = await api.post<ApiResponse<Role>>('/roles', roleData);
    return response.data.data;
  },

  updateRole: async (id: number, roleData: Partial<Role> & { permissions?: number[] }): Promise<Role> => {
    const response = await api.put<ApiResponse<Role>>(`/roles/${id}`, roleData);
    return response.data.data;
  },

  deleteRole: async (id: number): Promise<void> => {
    await api.delete(`/roles/${id}`);
  },

  getPermissions: async (): Promise<Permission[]> => {
    const response = await api.get<ApiResponse<Permission[]>>('/permissions');
    return response.data.data;
  },

  getAvailableRoles: async (): Promise<Role[]> => {
    const response = await api.get<ApiResponse<any[]>>('/roles-available');
    return (response.data.data || []).map((role: any) => ({
      id: role.id,
      name: role.name,
      display_name: role.display_name,
      description: role.description,
      type: role.type ?? 0,
      permissions: [],
      created_at: role.created_at ?? '',
      updated_at: role.updated_at ?? '',
    }));
  },
};
