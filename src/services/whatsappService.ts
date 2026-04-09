import api from '../lib/axios';
import type {
  WhatsappBroadcastPayload,
  WhatsappConversation,
  WhatsappCreateTemplatePayload,
  WhatsappMessage,
  WhatsappMetaConfig,
  WhatsappTemplatePreview,
} from '../types/whatsapp';

const unwrap = <T>(payload: any): T => payload?.data ?? payload;

export const whatsappService = {
  async getConversations(params?: { company_id?: number; search?: string }): Promise<WhatsappConversation[]> {
    const response = await api.get('/crm/whatsapp/conversations', { params });
    return unwrap<WhatsappConversation[]>(response.data);
  },

  async getConversationMessages(conversationId: string, companyId?: number): Promise<WhatsappMessage[]> {
    const response = await api.get(`/crm/whatsapp/conversations/${conversationId}/messages`, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return unwrap<WhatsappMessage[]>(response.data);
  },

  async markConversationAsRead(conversationId: string, companyId?: number): Promise<void> {
    await api.post(`/crm/whatsapp/conversations/${conversationId}/mark-read`, companyId ? { company_id: companyId } : {});
  },

  async sendMessage(payload: {
    company_id?: number;
    conversation_id?: string;
    to?: string;
    message?: string;
    template_name?: string;
    template_language?: string;
    template_variables?: string[];
  }): Promise<void> {
    await api.post('/crm/whatsapp/messages', payload);
  },

  async sendBroadcast(payload: WhatsappBroadcastPayload): Promise<void> {
    await api.post('/crm/whatsapp/broadcast', payload);
  },

  async getMetaConfig(companyId?: number): Promise<WhatsappMetaConfig> {
    const response = await api.get('/crm/whatsapp/config', {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return unwrap<WhatsappMetaConfig>(response.data);
  },

  async saveMetaConfig(payload: WhatsappMetaConfig & { company_id?: number }): Promise<WhatsappMetaConfig> {
    const response = await api.put('/crm/whatsapp/config', payload);
    return unwrap<WhatsappMetaConfig>(response.data);
  },

  async getTemplatePreview(params: {
    company_id?: number;
    template_name: string;
    template_language?: string;
  }): Promise<WhatsappTemplatePreview> {
    const response = await api.get('/crm/whatsapp/template-preview', { params });
    return unwrap<WhatsappTemplatePreview>(response.data);
  },

  async createTemplateInMeta(payload: WhatsappCreateTemplatePayload): Promise<{
    template: {
      name: string;
      language: string;
      category: string;
      label?: string | null;
      body_text?: string | null;
      status?: string;
      rejection_reason?: string | null;
      is_active?: boolean;
    };
    meta?: any;
  }> {
    const response = await api.post('/crm/whatsapp/templates', payload);
    return unwrap(response.data);
  },
};
