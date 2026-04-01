import api from '../lib/axios';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Client, ClientContact } from '../types/client';

const unwrap = <T>(payload: any): T => payload?.data ?? payload;

export const clientService = {
  async getClients(params?: { page?: number; per_page?: number; search?: string; company_id?: number; assigned_user_id?: number }): Promise<PaginatedResponse<Client>> {
    const response = await api.get('/clients', { params });
    return response.data;
  },

  async getClient(id: number): Promise<Client> {
    const response = await api.get(`/clients/${id}`);
    return unwrap<Client>(response.data);
  },

  async createClient(payload: Partial<Client>): Promise<Client> {
    const response = await api.post<ApiResponse<Client>>('/clients', payload);
    return unwrap<Client>(response.data);
  },

  async updateClient(id: number, payload: Partial<Client>): Promise<Client> {
    const response = await api.put<ApiResponse<Client>>(`/clients/${id}`, payload);
    return unwrap<Client>(response.data);
  },

  async deleteClient(id: number): Promise<void> {
    await api.delete(`/clients/${id}`);
  },

  async getContacts(clientId: number): Promise<ClientContact[]> {
    const response = await api.get(`/clients/${clientId}/contacts`);
    return unwrap<ClientContact[]>(response.data);
  },

  async createContact(clientId: number, payload: Partial<ClientContact>): Promise<ClientContact> {
    const response = await api.post<ApiResponse<ClientContact>>(`/clients/${clientId}/contacts`, payload);
    return unwrap<ClientContact>(response.data);
  },

  async updateContact(clientId: number, contactId: number, payload: Partial<ClientContact>): Promise<ClientContact> {
    const response = await api.put<ApiResponse<ClientContact>>(`/clients/${clientId}/contacts/${contactId}`, payload);
    return unwrap<ClientContact>(response.data);
  },

  async deleteContact(clientId: number, contactId: number): Promise<void> {
    await api.delete(`/clients/${clientId}/contacts/${contactId}`);
  },
};
