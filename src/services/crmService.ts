import api from '../lib/axios';
import type { PaginatedResponse } from '../types/api';
import type { CrmActivity, CrmActivityPayload, CrmCatalogItem } from '../types/crm';

const unwrap = <T>(payload: any): T => payload?.data ?? payload;

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
    return response.data;
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
};
