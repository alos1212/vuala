import api from '../lib/axios';
import type { ApiResponse, PaginatedResponse } from '../types/api';
import type { Client, ClientContact } from '../types/client';

const unwrap = <T>(payload: any): T => payload?.data ?? payload;

const normalizePaginatedResponse = <T>(payload: any): PaginatedResponse<T> => {
  const source = payload?.data?.meta || payload?.data?.current_page ? payload.data : payload;

  if (source?.meta) {
    return source as PaginatedResponse<T>;
  }

  return {
    data: Array.isArray(source?.data) ? source.data : [],
    meta: {
      current_page: Number(source?.current_page) || 1,
      last_page: Number(source?.last_page) || 1,
      per_page: Number(source?.per_page) || 20,
      total: Number(source?.total) || 0,
      from: source?.from ?? undefined,
      to: source?.to ?? undefined,
    },
    links: {
      first: source?.first_page_url ?? '',
      last: source?.last_page_url ?? '',
      prev: source?.prev_page_url ?? null,
      next: source?.next_page_url ?? null,
    },
  };
};

export const clientService = {
  async getClients(params?: {
    page?: number;
    per_page?: number;
    search?: string;
    company_id?: number;
    assigned_user_id?: number;
    country_id?: number;
    state_id?: number;
    city_id?: number;
  }): Promise<PaginatedResponse<Client>> {
    const response = await api.get('/clients', { params });
    return normalizePaginatedResponse<Client>(response.data);
  },

  async getClient(id: number): Promise<Client> {
    const response = await api.get(`/clients/${id}`);
    return unwrap<Client>(response.data);
  },

  async createClient(payload: Partial<Client>): Promise<Client> {
    const response = await api.post<ApiResponse<Client>>('/clients', payload);
    return unwrap<Client>(response.data);
  },

  async importClients(file: File, companyId?: number): Promise<{
    total_rows: number;
    valid_rows: number;
    consolidated_rows: number;
    skipped_by_format: number;
    created_clients: number;
    reused_clients: number;
    created_contacts: number;
    skipped_existing_contacts: number;
    errors: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);
    if (companyId) {
      formData.append('company_id', String(companyId));
    }

    const response = await api.post('/clients/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    return unwrap(response.data);
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
