import api from '../lib/axios';
import type { PaginatedResponse } from '../types/api';
import type {
  CrmActivity,
  CrmActivityPayload,
  CrmCatalogItem,
  CrmContact,
  CrmContactPayload,
  CrmEmailCampaign,
  CrmEmailCampaignPayload,
  CrmEmailCampaignRecipient,
  CrmEmailPreviewPayload,
  CrmEmailPreviewResponse,
  CrmEmailTemplate,
  CrmEmailTemplatePayload,
} from '../types/crm';

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

  async getMarketingTemplates(params?: Record<string, unknown>): Promise<PaginatedResponse<CrmEmailTemplate>> {
    const response = await api.get('/crm/marketing/templates', { params });
    return normalizePaginatedResponse<CrmEmailTemplate>(response.data);
  },

  async createMarketingTemplate(payload: CrmEmailTemplatePayload): Promise<CrmEmailTemplate> {
    const response = await api.post('/crm/marketing/templates', payload);
    return unwrap<CrmEmailTemplate>(response.data);
  },

  async getMarketingTemplate(id: number): Promise<CrmEmailTemplate> {
    const response = await api.get(`/crm/marketing/templates/${id}`);
    return unwrap<CrmEmailTemplate>(response.data);
  },

  async updateMarketingTemplate(id: number, payload: Partial<CrmEmailTemplatePayload>): Promise<CrmEmailTemplate> {
    const response = await api.put(`/crm/marketing/templates/${id}`, payload);
    return unwrap<CrmEmailTemplate>(response.data);
  },

  async deleteMarketingTemplate(id: number): Promise<void> {
    await api.delete(`/crm/marketing/templates/${id}`);
  },

  async getMarketingCampaigns(params?: Record<string, unknown>): Promise<PaginatedResponse<CrmEmailCampaign>> {
    const response = await api.get('/crm/marketing/campaigns', { params });
    return normalizePaginatedResponse<CrmEmailCampaign>(response.data);
  },

  async createMarketingCampaign(payload: CrmEmailCampaignPayload): Promise<CrmEmailCampaign> {
    const response = await api.post('/crm/marketing/campaigns', payload);
    return unwrap<CrmEmailCampaign>(response.data);
  },

  async getMarketingCampaign(id: number): Promise<CrmEmailCampaign> {
    const response = await api.get(`/crm/marketing/campaigns/${id}`);
    return unwrap<CrmEmailCampaign>(response.data);
  },

  async updateMarketingCampaign(id: number, payload: Partial<CrmEmailCampaignPayload>): Promise<CrmEmailCampaign> {
    const response = await api.put(`/crm/marketing/campaigns/${id}`, payload);
    return unwrap<CrmEmailCampaign>(response.data);
  },

  async deleteMarketingCampaign(id: number): Promise<void> {
    await api.delete(`/crm/marketing/campaigns/${id}`);
  },

  async launchMarketingCampaign(id: number): Promise<void> {
    await api.post(`/crm/marketing/campaigns/${id}/launch`);
  },

  async sendMarketingCampaignNow(id: number): Promise<void> {
    await api.post(`/crm/marketing/campaigns/${id}/send-now`);
  },

  async cancelMarketingCampaign(id: number): Promise<void> {
    await api.post(`/crm/marketing/campaigns/${id}/cancel`);
  },

  async getMarketingCampaignRecipients(id: number, params?: Record<string, unknown>): Promise<PaginatedResponse<CrmEmailCampaignRecipient>> {
    const response = await api.get(`/crm/marketing/campaigns/${id}/recipients`, { params });
    return normalizePaginatedResponse<CrmEmailCampaignRecipient>(response.data);
  },

  async previewMarketingEmail(payload: CrmEmailPreviewPayload): Promise<CrmEmailPreviewResponse> {
    const response = await api.post('/crm/marketing/preview', payload);
    return unwrap<CrmEmailPreviewResponse>(response.data);
  },
};
