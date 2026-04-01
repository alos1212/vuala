import api from '../lib/axios';
import type { Company, CompanyUpsertPayload } from '../types/company';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { User } from '../types/auth';

const unwrap = <T>(payload: any): T => payload?.data ?? payload;

const toCompanyFormData = (payload: CompanyUpsertPayload): FormData => {
  const formData = new FormData();
  const hasLogoFile = payload.logo instanceof File;

  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (hasLogoFile && key === 'logo_path') return;

    if (value instanceof File) {
      formData.append(key, value);
      return;
    }

    if (typeof value === 'boolean') {
      formData.append(key, value ? '1' : '0');
      return;
    }

    formData.append(key, String(value));
  });

  return formData;
};

export const companyService = {
  async getCompanies(params?: { page?: number; per_page?: number; search?: string }): Promise<PaginatedResponse<Company>> {
    const response = await api.get('/companies', { params });
    return response.data;
  },

  async getCompany(id: number): Promise<Company> {
    const response = await api.get(`/companies/${id}`);
    return unwrap<Company>(response.data);
  },

  async getMyCompany(): Promise<Company> {
    const response = await api.get('/my-company');
    return unwrap<Company>(response.data);
  },

  async createCompany(payload: CompanyUpsertPayload): Promise<Company> {
    const response = await api.post<ApiResponse<Company>>('/companies', toCompanyFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap<Company>(response.data);
  },

  async updateCompany(id: number, payload: CompanyUpsertPayload): Promise<Company> {
    const response = await api.post<ApiResponse<Company>>(`/companies/${id}`, toCompanyFormData({
      ...payload,
      _method: 'PUT',
    }), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap<Company>(response.data);
  },

  async updateMyCompany(payload: CompanyUpsertPayload): Promise<Company> {
    const response = await api.post<ApiResponse<Company>>('/my-company', toCompanyFormData({
      ...payload,
      _method: 'PUT',
    }), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap<Company>(response.data);
  },

  async deleteCompany(id: number): Promise<void> {
    await api.delete(`/companies/${id}`);
  },

  async getCompanyUsers(companyId: number): Promise<User[]> {
    const response = await api.get(`/companies/${companyId}/users`);
    return unwrap<User[]>(response.data);
  },

  async getMyCompanyUsers(): Promise<User[]> {
    const response = await api.get('/my-company/users');
    return unwrap<User[]>(response.data);
  },

  async createCompanyUser(companyId: number, payload: any): Promise<User> {
    const response = await api.post<ApiResponse<User>>(`/companies/${companyId}/users`, payload);
    return unwrap<User>(response.data);
  },

  async createMyCompanyUser(payload: any): Promise<User> {
    const response = await api.post<ApiResponse<User>>('/my-company/users', payload);
    return unwrap<User>(response.data);
  },

  async updateCompanyUser(companyId: number, userId: number, payload: any): Promise<User> {
    const response = await api.put<ApiResponse<User>>(`/companies/${companyId}/users/${userId}`, payload);
    return unwrap<User>(response.data);
  },

  async updateMyCompanyUser(userId: number, payload: any): Promise<User> {
    const response = await api.put<ApiResponse<User>>(`/my-company/users/${userId}`, payload);
    return unwrap<User>(response.data);
  },

  async deleteCompanyUser(companyId: number, userId: number): Promise<void> {
    await api.delete(`/companies/${companyId}/users/${userId}`);
  },

  async deleteMyCompanyUser(userId: number): Promise<void> {
    await api.delete(`/my-company/users/${userId}`);
  },

  async getCompanyUserProfile(companyId: number, userId: number): Promise<any> {
    const response = await api.get(`/companies/${companyId}/users/${userId}/profile`);
    return unwrap<any>(response.data);
  },

  async getMyCompanyUserProfile(userId: number): Promise<any> {
    const response = await api.get(`/my-company/users/${userId}/profile`);
    return unwrap<any>(response.data);
  },
};
