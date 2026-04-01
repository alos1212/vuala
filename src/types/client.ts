import type { Company } from './company';
import type { User } from './auth';

export interface ClientContact {
  id: number;
  client_id: number;
  name: string;
  position?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary?: boolean;
  is_active?: boolean;
  status?: number | string | null;
}

export interface Client {
  id: number;
  company_id: number;
  assigned_user_id?: number | null;
  name: string;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  country_id?: number | null;
  state_id?: number | null;
  city_id?: number | null;
  notes?: string | null;
  is_active?: boolean;
  status?: number | string | null;
  company?: Company;
  assignedUser?: Pick<User, 'id' | 'name' | 'email'> | null;
  contacts?: ClientContact[];
}
