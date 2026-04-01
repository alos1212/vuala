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
  client_id: number;
  client_contact_id?: number | null;
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
  client?: Pick<Client, 'id' | 'name'>;
  contact?: Pick<ClientContact, 'id' | 'name' | 'email' | 'phone'> | null;
  managementType?: CrmCatalogItem;
  resultType?: CrmCatalogItem | null;
  assignedUser?: Pick<User, 'id' | 'name' | 'email'> | null;
}

export interface CrmActivityPayload {
  company_id?: number;
  client_id: number;
  client_contact_id?: number | null;
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
