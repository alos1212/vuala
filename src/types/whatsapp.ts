export interface WhatsappConversation {
  id: string;
  client_id?: number | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count?: number;
  status?: 'open' | 'pending' | 'closed' | string;
  client?: {
    id: number;
    name: string;
    client_type?: 'person' | 'company' | null;
    company?: {
      id?: number;
      name?: string;
    } | null;
  } | null;
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
  default_template_name?: string | null;
  default_template_language?: string | null;
  templates?: Array<{
    name: string;
    language?: string | null;
    label?: string | null;
    is_active?: boolean;
  }>;
  updated_at?: string | null;
}

export interface WhatsappBroadcastPayload {
  company_id?: number;
  recipients?: string[];
  message?: string;
  template_name?: string;
  template_language?: string;
  template_variables?: string[];
  recipient_client_id?: number;
  country_id?: number;
  state_id?: number;
  city_id?: number;
  include_client_contacts?: boolean;
}
