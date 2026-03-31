// src/services/insurancePlanCategoryService.ts
import api from '../lib/axios';
import type { InsurancePlanCategory } from '../types/insurancePlanCategory';

export const insurancePlanCategoryService = {
  getInsurancePlanCategories: async (): Promise<InsurancePlanCategory[]> => {
    const response = await api.get<InsurancePlanCategory[]>('/insurance-plan-categories');
    return response.data;
  },

  getInsurancePlanCategory: async (id: number): Promise<InsurancePlanCategory> => {
    const response = await api.get<InsurancePlanCategory>(`/insurance-plan-categories/${id}`);
    return response.data;
  },

  createInsurancePlanCategory: async (data: Omit<InsurancePlanCategory, 'id' | 'created_at' | 'updated_at'>): Promise<InsurancePlanCategory> => {
    const response = await api.post<InsurancePlanCategory>('/insurance-plan-categories', data);
    return response.data;
  },

  updateInsurancePlanCategory: async (id: number, data: Partial<InsurancePlanCategory>): Promise<InsurancePlanCategory> => {
    const response = await api.put<InsurancePlanCategory>(`/insurance-plan-categories/${id}`, data);
    return response.data;
  },

  deleteInsurancePlanCategory: async (id: number): Promise<void> => {
    await api.delete(`/insurance-plan-categories/${id}`);
  },
};
