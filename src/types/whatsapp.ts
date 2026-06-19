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
  delivered_at?: string | null;
  read_at?: string | null;
  meta?: {
    attachment?: {
      kind?: 'image' | 'video' | 'audio' | 'document' | string;
      url?: string | null;
      file_name?: string | null;
      mime_type?: string | null;
      size?: number | null;
      caption?: string | null;
      media_id?: string | null;
    } | null;
    channel?: string | null;
    reason?: string | null;
    errors?: Array<{
      code?: number | string | null;
      title?: string | null;
      message?: string | null;
      error_data?: {
        details?: string | null;
      } | null;
    }>;
    body?: {
      error?: {
        code?: number | string | null;
        message?: string | null;
        error_user_msg?: string | null;
        error_data?: {
          details?: string | null;
        } | null;
      } | null;
      errors?: Array<{
        code?: number | string | null;
        title?: string | null;
        message?: string | null;
        error_data?: {
          details?: string | null;
        } | null;
      }>;
    } | null;
    fallback?: {
      reason?: string | null;
      body?: {
        error?: {
          code?: number | string | null;
          message?: string | null;
          error_user_msg?: string | null;
          error_data?: {
            details?: string | null;
          } | null;
        } | null;
      } | null;
    } | null;
    [key: string]: unknown;
  } | null;
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
    body?: string | null;
    body_text?: string | null;
    header_format?: 'NONE' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | string | null;
    status?: string | null;
    rejection_reason?: string | null;
    components?: Array<{
      type?: string | null;
      text?: string | null;
      format?: string | null;
    }>;
  }>;
  updated_at?: string | null;
}

export interface WhatsappBroadcastPayload {
  company_id?: number;
  recipients?: string[];
  message?: string;
  template_name?: string;
  template_language?: string;
  template_body_text?: string;
  template_header_format?: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'TEXT' | 'NONE' | string;
  template_header_media?: File | null;
  template_variables?: string[];
  template_variable_sources?: string[];
  recipient_client_id?: number;
  recipient_contact_id?: number;
  recipient_contact_ids?: number[];
  include_client_phone?: boolean;
  country_id?: number;
  state_id?: number;
  city_id?: number;
  include_client_contacts?: boolean;
}

export interface WhatsappTemplatePreview {
  name: string;
  language: string;
  status?: string;
  category?: string;
  body_text: string;
  header_format?: 'NONE' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'TEXT' | string;
  variable_indexes: number[];
  variable_count: number;
  components?: Array<{
    type?: string | null;
    text?: string | null;
    format?: string | null;
  }>;
}

export interface WhatsappCreateTemplatePayload {
  company_id?: number;
  name: string;
  language?: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  body_text: string;
  label?: string;
  header_format?: 'NONE' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | string;
  header_media_sample?: File | null;
  example_values?: string[];
}
