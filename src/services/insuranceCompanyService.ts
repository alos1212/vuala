import api from '../lib/axios';
import type { InsuranceCompany } from '../types/insuranceCompany';
export const insuranceCompanyService = {
    getInsuranceCompanies: async (): Promise<InsuranceCompany[]> => {
        const response = await api.get<InsuranceCompany[]>('/insurance-companies');
        console.log(response.data);
        return response.data; // ya es un array
    },

    getInsuranceCompany: async (id: number): Promise<InsuranceCompany> => {
        const response = await api.get<InsuranceCompany>(`/insurance-companies/${id}`);
        return response.data;
    },

    createInsuranceCompany: async (formData: FormData): Promise<InsuranceCompany> => {
        const response = await api.post<InsuranceCompany>('/insurance-companies', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    updateInsuranceCompany: async (id: number, formData: FormData): Promise<InsuranceCompany> => {
        const response = await api.post<InsuranceCompany>(`/insurance-companies/${id}?_method=PUT`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    deleteInsuranceCompany: async (id: number): Promise<void> => {
        await api.delete(`/insurance-companies/${id}`);
    },
};
