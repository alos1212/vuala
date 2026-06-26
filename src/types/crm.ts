import type { Client, ClientContact } from './client';
import type { Company } from './company';
import type { User } from './auth';

export interface CrmCatalogItem {
  id: number;
  name: string;
  slug: string;
  color?: string | null;
  icon?: string | null;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
  is_system?: boolean;
}

export interface CrmActivity {
  id: number;
  company_id: number;
  client_id?: number | null;
  client_contact_id?: number | null;
  crm_contact_id?: number | null;
  management_type_id: number;
  result_type_id?: number | null;
  assigned_user_id?: number | null;
  subject: string;
  description?: string | null;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled' | 'pending';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  location_name?: string | null;
  address?: string | null;
  scheduled_start_at: string;
  scheduled_end_at?: string | null;
  completed_at?: string | null;
  follow_up_at?: string | null;
  requires_follow_up?: boolean;
  result_notes?: string | null;
  company?: Pick<Company, 'id' | 'name'>;
  client?: Pick<Client, 'id' | 'name' | 'company_id'> | null;
  contact?: Pick<ClientContact, 'id' | 'name' | 'email' | 'phone'> | null;
  crmContact?: Pick<CrmContact, 'id' | 'name' | 'email' | 'phone' | 'client_id'> & {
    client?: Pick<Client, 'id' | 'name' | 'company_id'> | null;
  } | null;
  managementType?: CrmCatalogItem;
  resultType?: CrmCatalogItem | null;
  assignedUser?: Pick<User, 'id' | 'name' | 'email'> | null;
}

export interface CrmContact {
  id: number;
  company_id: number;
  client_id?: number | null;
  name: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary?: boolean;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
  status?: number | string | null;
  company?: Pick<Company, 'id' | 'name'> | null;
  client?: Pick<Client, 'id' | 'name' | 'company_id' | 'client_type'> | null;
  activities_count?: number;
}

export interface CrmContactPayload {
  company_id?: number | null;
  client_id?: number | null;
  name: string;
  position?: string;
  email?: string;
  phone?: string;
  is_primary?: boolean;
  address?: string;
  notes?: string;
  is_active?: boolean;
  status?: number | 'active' | 'inactive' | null;
}

export interface CrmActivityPayload {
  company_id?: number | null;
  client_id?: number | null;
  client_contact_id?: number | null;
  crm_contact_id?: number | null;
  management_type_id: number;
  result_type_id?: number | null;
  assigned_user_id?: number | null;
  subject: string;
  description?: string;
  status?: CrmActivity['status'];
  priority?: CrmActivity['priority'];
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  location_name?: string;
  address?: string;
  scheduled_start_at: string;
  scheduled_end_at?: string | null;
  completed_at?: string | null;
  follow_up_at?: string | null;
  requires_follow_up?: boolean;
  result_notes?: string;
}

export interface CrmEmailTemplate {
  id: number;
  company_id: number;
  name: string;
  slug: string;
  subject: string;
  preheader?: string | null;
  body_html: string;
  body_text?: string | null;
  is_active?: boolean;
  status?: number;
  company?: Pick<Company, 'id' | 'name'> | null;
  creator?: Pick<User, 'id' | 'name'> | null;
  updater?: Pick<User, 'id' | 'name'> | null;
}

export interface CrmEmailTemplatePayload {
  company_id?: number | null;
  name: string;
  slug?: string;
  subject: string;
  preheader?: string | null;
  body_html: string;
  body_text?: string | null;
  is_active?: boolean;
}

export interface CrmEmailCampaign {
  id: number;
  company_id: number;
  template_id: number;
  name: string;
  status: 'draft' | 'scheduled' | 'processing' | 'sent' | 'partial' | 'failed' | 'cancelled';
  audience_source: 'crm_contacts' | 'users';
  audience_filters?: {
    client_id?: number | null;
    country_id?: number | null;
    state_id?: number | null;
    city_id?: number | null;
    role_id?: number | null;
    only_active?: boolean;
    only_primary?: boolean;
  } | null;
  reply_to_email?: string | null;
  reply_to_name?: string | null;
  subject_override?: string | null;
  preheader_override?: string | null;
  body_html_override?: string | null;
  body_text_override?: string | null;
  total_recipients?: number;
  pending_count?: number;
  sent_count?: number;
  failed_count?: number;
  skipped_count?: number;
  scheduled_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  last_error?: string | null;
  company?: Pick<Company, 'id' | 'name'> | null;
  template?: Pick<CrmEmailTemplate, 'id' | 'name' | 'subject' | 'preheader'> | null;
  creator?: Pick<User, 'id' | 'name'> | null;
  updater?: Pick<User, 'id' | 'name'> | null;
}

export interface CrmEmailCampaignPayload {
  company_id?: number | null;
  template_id: number;
  name: string;
  status?: 'draft' | 'scheduled';
  audience_source: 'crm_contacts' | 'users';
  audience_filters?: {
    client_id?: number | null;
    country_id?: number | null;
    state_id?: number | null;
    city_id?: number | null;
    role_id?: number | null;
    only_active?: boolean;
    only_primary?: boolean;
  };
  reply_to_email?: string | null;
  reply_to_name?: string | null;
  subject_override?: string | null;
  preheader_override?: string | null;
  body_html_override?: string | null;
  body_text_override?: string | null;
  scheduled_at?: string | null;
}

export interface CrmEmailCampaignRecipient {
  id: number;
  campaign_id: number;
  company_id: number;
  recipient_type: 'crm_contact' | 'user';
  recipient_id?: number | null;
  recipient_name?: string | null;
  recipient_email: string;
  status: 'pending' | 'processing' | 'sent' | 'failed' | 'skipped';
  variables?: Record<string, string> | null;
  provider_message_id?: string | null;
  attempted_at?: string | null;
  sent_at?: string | null;
  last_error?: string | null;
}

export interface CrmEmailPreviewPayload {
  company_id?: number | null;
  template_id?: number | null;
  client_id?: number | null;
  subject?: string | null;
  preheader?: string | null;
  body_html?: string | null;
  body_text?: string | null;
  variables?: Record<string, string>;
}

export interface CrmEmailPreviewResponse {
  subject: string;
  preheader?: string | null;
  body_html: string;
  body_text: string;
}
