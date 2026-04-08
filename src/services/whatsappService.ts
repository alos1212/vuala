import api from '../lib/axios';
import type { WhatsappBroadcastPayload, WhatsappConversation, WhatsappMessage, WhatsappMetaConfig } from '../types/whatsapp';

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

  async sendMessage(payload: { company_id?: number; conversation_id?: string; to?: string; message: string }): Promise<void> {
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
};
