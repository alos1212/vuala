export interface InsuranceSearchParams {
  origin: string;
  destination: string;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  days: number;
  passengers: number;
  ages: number[];
  agency?: string | number;
  plan_type?: string | number;
}

export interface InsuranceSearchResult {
  id: number;
  company_id: number;
  code: string;
  name: string;
  status: string | number;
  minimum_age: number;
  maximum_age: number;
  minimum_days: number;
  maximum_days: number;
  discount: string | number;
  category: string | number;
  for: string | number;
  plan_type?: string | number;
  plan_type_id?: string | number;
  plan_type_name?: string;
  value_of: number | string;
  value_by?: number | null;
  value_per_day: string | number;
  cost_of: number | string;
  cost_value: string | number;
  currency: string | null;
  national: number;
  special: number;
  special_payment: string | number;
  deleted: number;
  coverage_value: string | number;
  relevance: number;
  agency_credit_limit?: number | null;
  agency_credit_available?: number | null;
  origins: string;
  destinations: string;
  exceptions?: string;
  created_at?: string;
  updated_at?: string;
  company: {
    id: number;
    name: string;
    logo: string | null;
    logo_url: string | null;
    cashback?: string | number | null;
  };
  comparatives: Array<{
    id: number;
    name: string;
    name_en?: string;
    text: string;
    text_en?: string;
    value1?: string;
    value2?: string | number;
    order?: number;
    is_filterable?: number;
    is_comparative?: number;
    in_results?: number;
  }>;
  values: {
    days: number;
    value_person: number;
    exchangeRate?: number;
    ages: Array<{
      age: string | number;
      valuebase?: number;
      promotion_text?: string;
      increment?: string;
      value?: number;
      discount?: number;
      value_old?: number;
    }>;
    total_value: number;
    total_value_old?: number;
    promotion_text?: string;
    commission?: number;
    commission_percent?: number;
  };
}
