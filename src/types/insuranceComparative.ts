export interface ComparativePlan {
  id: number;
  name: string;
  company_name: string;
  company_logo: string | null;
  company_logo_path?: string | null;
  label?: string | null;
  primary_value?: string | number | null;
  price_cop?: string | null;
  price_usd?: string | number | null;
  price_cop_original?: string | number | null;
  price_usd_original?: string | number | null;
  has_promotion?: boolean;
  promotion_text?: string | null;
}

export interface ComparativeCoverage {
  label: string;
  values: Array<string | number | null>;
}

export interface InsuranceComparativeResponse {
  status: string;
  plans: ComparativePlan[];
  coverages: ComparativeCoverage[];
}
