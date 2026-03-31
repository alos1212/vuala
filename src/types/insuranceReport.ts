export interface InsuranceTravelerReportRow {
  id: number;
  purchase_id: number;
  voucher: string | null;
  first_name: string;
  last_name: string;
  document_number: string | null;
  value: number | null;
  previous_value: number | null;
  promotion_text?: string | null;
  issued_at?: string | null;
  canceled?: boolean | null;
  canceled_at?: string | null;
  plan_id?: number | null;
  plan_name?: string | null;
  plan_type_name?: string | null;
  plan_label?: string | null;
  company_name?: string | null;
  national?: number | null;
  amount?: number | null;
  currency?: string | null;
  exchange_rate?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  purchase_created_at?: string | null;
  agency_id?: number | null;
  agency_name?: string | null;
}

export interface InsuranceTravelerReportResponse {
  status: string;
  data: {
    data: InsuranceTravelerReportRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
