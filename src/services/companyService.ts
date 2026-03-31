import api from '../lib/axios';
import type { Company } from '../types/company';
import type { ApiResponse } from '../types/api';

export const companyService = {
  getCompanies: async (): Promise<Company[]> => {
    const response = await api.get<Company[]>('/companies');
    const data = response.data as any;
    return Array.isArray(data?.data) ? data.data : data;
  },
  getCompany: async (id: number): Promise<Company> => {
    const response = await api.get<Company | ApiResponse<Company>>(`/companies/${id}`);
    const data = response.data as any;
    return data?.data ?? data;
  },
  createCompany: async (formData: FormData): Promise<Company> => {
    const response = await api.post<Company>('/companies', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },
  updateCompany: async (id: number, formData: FormData): Promise<Company> => {
    const response = await api.put<Company>(`/companies/${id}`, formData)
    return response.data;
  },
  deleteCompany: async (id: number): Promise<void> => {
    await api.delete(`/companies/${id}`);
  },
};
