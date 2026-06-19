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
