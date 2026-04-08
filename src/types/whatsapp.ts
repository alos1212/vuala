export interface WhatsappConversation {
  id: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
  status?: 'open' | 'pending' | 'closed' | string;
}

export interface WhatsappMessage {
  id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  sent_at: string;
  status?: 'sent' | 'delivered' | 'read' | 'failed' | string;
}

export interface WhatsappMetaConfig {
  is_configured?: boolean;
  is_active?: boolean;
  business_account_id?: string | null;
  phone_number_id?: string | null;
  access_token?: string | null;
  verify_token?: string | null;
  app_id?: string | null;
  app_secret?: string | null;
  webhook_url?: string | null;
  updated_at?: string | null;
}

export interface WhatsappBroadcastPayload {
  company_id?: number;
  recipients: string[];
  message: string;
}
