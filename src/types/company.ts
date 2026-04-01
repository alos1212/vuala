export interface Company {
  id: number;
  name: string;
  tax_id?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  country_id?: number | null;
  state_id?: number | null;
  city_id?: number | null;
  color_primary?: string | null;
  color_secondary?: string | null;
  logo_path?: string | null;
  is_active?: boolean;
  status?: number | string | null;
  users_count?: number;
  clients_count?: number;
}

export interface CompanyUpsertPayload extends Partial<Company> {
  logo?: File | null;
  _method?: 'PUT';
}
