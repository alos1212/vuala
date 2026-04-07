import api from '../lib/axios';
import type { ApiResponse } from '../types/api';
import type { ClientCategory } from '../types/clientCategory';

const unwrap = <T>(payload: any): T => payload?.data ?? payload;

export const clientCategoryService = {
  async getCategories(companyId?: number): Promise<ClientCategory[]> {
    const response = await api.get('/clients/categories/list', {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return unwrap<ClientCategory[]>(response.data);
  },

  async createCategory(payload: { company_id?: number; name: string; description?: string }): Promise<ClientCategory> {
    const response = await api.post<ApiResponse<ClientCategory>>('/clients/categories', payload);
    return unwrap<ClientCategory>(response.data);
  },

  async updateCategory(
    categoryId: number,
    payload: { name?: string; description?: string; is_active?: boolean }
  ): Promise<ClientCategory> {
    const response = await api.put<ApiResponse<ClientCategory>>(`/clients/categories/${categoryId}`, payload);
    return unwrap<ClientCategory>(response.data);
  },
};
