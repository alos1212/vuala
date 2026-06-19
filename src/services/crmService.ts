import api from '../lib/axios';
import type { PaginatedResponse } from '../types/api';
import type { CrmActivity, CrmActivityPayload, CrmCatalogItem, CrmContact, CrmContactPayload } from '../types/crm';

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

export const crmService = {
  async getManagementTypes(): Promise<CrmCatalogItem[]> {
    const response = await api.get('/crm/types');
    return unwrap<CrmCatalogItem[]>(response.data);
  },

  async getResultTypes(): Promise<CrmCatalogItem[]> {
    const response = await api.get('/crm/results');
    return unwrap<CrmCatalogItem[]>(response.data);
  },

  async getActivities(params?: Record<string, unknown>): Promise<PaginatedResponse<CrmActivity>> {
    const response = await api.get('/crm/activities', { params });
    return normalizePaginatedResponse<CrmActivity>(response.data);
  },

  async getCalendar(params?: Record<string, unknown>): Promise<CrmActivity[]> {
    const response = await api.get('/crm/activities/calendar', { params });
    return unwrap<CrmActivity[]>(response.data);
  },

  async getActivity(id: number): Promise<CrmActivity> {
    const response = await api.get(`/crm/activities/${id}`);
    return unwrap<CrmActivity>(response.data);
  },

  async createActivity(payload: CrmActivityPayload): Promise<CrmActivity> {
    const response = await api.post('/crm/activities', payload);
    return unwrap<CrmActivity>(response.data);
  },

  async updateActivity(id: number, payload: Partial<CrmActivityPayload>): Promise<CrmActivity> {
    const response = await api.put(`/crm/activities/${id}`, payload);
    return unwrap<CrmActivity>(response.data);
  },

  async deleteActivity(id: number): Promise<void> {
    await api.delete(`/crm/activities/${id}`);
  },

  async getContacts(params?: Record<string, unknown>): Promise<PaginatedResponse<CrmContact>> {
    const response = await api.get('/crm/contacts', { params });
    return normalizePaginatedResponse<CrmContact>(response.data);
  },

  async getContact(id: number): Promise<CrmContact> {
    const response = await api.get(`/crm/contacts/${id}`);
    return unwrap<CrmContact>(response.data);
  },

  async createContact(payload: CrmContactPayload): Promise<CrmContact> {
    const response = await api.post('/crm/contacts', payload);
    return unwrap<CrmContact>(response.data);
  },

  async updateContact(id: number, payload: Partial<CrmContactPayload>): Promise<CrmContact> {
    const response = await api.put(`/crm/contacts/${id}`, payload);
    return unwrap<CrmContact>(response.data);
  },

  async deleteContact(id: number): Promise<void> {
    await api.delete(`/crm/contacts/${id}`);
  },
};
