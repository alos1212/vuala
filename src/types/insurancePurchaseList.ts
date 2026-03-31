export interface InsurancePurchaseListPayment {
  id?: number;
  platform?: string | null;
  method?: string | null;
  status?: string | null;
  currency?: string | null;
  amount?: string | number | null;
  exchange_rate?: string | number | null;
  created_at?: string | null;
  updated_at?: string | null;
  paid_at?: string | null;
}

export interface InsurancePurchaseListTravelerSummary {
  id?: number;
  first_name?: string | null;
  last_name?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  voucher?: string | null;
  issued_at?: string | null;
  canceled?: boolean | number | string | null;
  status_label?: string | null;
  canceled_label?: string | null;
  [key: string]: unknown;
}

export interface InsurancePurchaseListItem {
  id: number;
  purchase_id?: number;
  plan_name?: string;
  plan_type_name?: string;
  document_number?: string;
  start_date?: string;
  end_date?: string;
  emission_date?: string;
  product_name?: string;
  amount?: string | number | null;
  currency?: string | null;
  exchange_rate?: string | number | null;
  travelers_count?: number;
  travelers?: InsurancePurchaseListTravelerSummary[];
  agency?: string | number | null;
  agency_name?: string | null;
  payments?: InsurancePurchaseListPayment[];
  [key: string]: unknown;
}

export interface InsuranceTravelerListItem {
  id: number;
  purchase_id?: number;
  index?: number;
  first_name?: string;
  last_name?: string;
  document_type?: string;
  document_number?: string;
  birth_date?: string;
  email?: string | null;
  phone?: string | null;
  plan_name?: string | null;
  plan_type_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  canceled?: boolean | number;
  [key: string]: unknown;
}
