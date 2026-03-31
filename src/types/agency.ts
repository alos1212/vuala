import type { User } from "./auth";

export interface Agency {
  id: number;
  name: string;
  code?: string | null;
  status?: number | string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  tax_id?: string | null;
  tax_regime?: string | null;
  country_id?: number | null;
  state_id?: number | null;
  city_id?: number | null;
  commission?: number | string | null;
  credit_limit?: number | string | null;
  color_primary?: string | null;
  color_secondary?: string | null;
  sale_type?: number | string | null;
  manager_user_id?: number | null;
  is_domestic?: boolean;
  is_international?: boolean;
  allows_passengers?: boolean;
  allows_groups?: boolean;
  allows_pets?: boolean;
  cashback?: boolean | number | string | null;
  accumulates_points?: boolean | number | string | null;
  profit?: boolean | number | string | null;
  hotels_enabled?: boolean;
  logo_path?: string | null;
  logo?: File | null;
  website?: number | null; // id de compañía
}

export interface AgencyDetail extends Agency {
  users?: User[];
}
