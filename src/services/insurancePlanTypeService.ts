// src/lib/services/insurancePlanTypeService.ts
import  api  from "../lib/axios"
import type { InsurancePlanType } from '../types/insurancePlanType';

export const insurancePlanTypeService = {
  getInsurancePlanTypes: async (): Promise<InsurancePlanType[]> => {
    const response = await api.get<InsurancePlanType[]>('/insurance-plan-types');
    return response.data;
  },

  getInsurancePlanType: async (id: number): Promise<InsurancePlanType> => {
    const response = await api.get<InsurancePlanType>(`/insurance-plan-types/${id}`);
    return response.data;
  },

  createInsurancePlanType: async (data: Omit<InsurancePlanType, 'id' | 'created_at' | 'updated_at'>): Promise<InsurancePlanType> => {
    const response = await api.post<InsurancePlanType>('/insurance-plan-types', data);
    return response.data;
  },

  updateInsurancePlanType: async (id: number, data: Partial<InsurancePlanType>): Promise<InsurancePlanType> => {
    const response = await api.put<InsurancePlanType>(`/insurance-plan-types/${id}`, data);
    return response.data;
  },

  deleteInsurancePlanType: async (id: number): Promise<void> => {
    await api.delete(`/insurance-plan-types/${id}`);
  },
};
