export interface ClientCategory {
  id: number;
  company_id: number;
  name: string;
  description?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

