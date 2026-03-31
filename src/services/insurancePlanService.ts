import api from '../lib/axios';
import type { InsurancePlan } from '../types/insurancePlan';

export const insurancePlanService = {
  getInsurancePlans: async (): Promise<InsurancePlan[]> => {
    const response = await api.get<InsurancePlan[]>('/insurance-plans');
    return response.data;
  },
  getInsurancePlan: async (id: number): Promise<InsurancePlan> => {
    const response = await api.get<InsurancePlan>(`/insurance-plans/${id}`);
    return response.data;
  },
  getInsurancePlanAgencies: async (id: number) => {
    const response = await api.get(`/insurance-plans/${id}/agencies`);
    return (response.data as any).data ?? response.data;
  },
  createInsurancePlan: async (formData: FormData): Promise<InsurancePlan> => {
    const response = await api.post<InsurancePlan>('/insurance-plans', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  updateInsurancePlan: async (id: number, formData: FormData): Promise<InsurancePlan> => {
    const response = await api.post<InsurancePlan>(`/insurance-plans/${id}?_method=PUT`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  deleteInsurancePlan: async (id: number): Promise<void> => {
    await api.delete(`/insurance-plans/${id}`);
  },
};
