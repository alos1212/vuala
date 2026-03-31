export interface AdditionalValue {
  id: number;
  insurance_plan_id: number;
  code: string;
  value_type: number | string;
  value_amount: number;
  currency: string;
  commission_type?: 'included' | 'not_included' | string;
  is_default?: boolean;
  active: boolean;
}

export interface AdditionalValuePayload {
  code: string;
  value_type: number | string;
  value_amount: number | string;
  currency: string;
  commission_type?: 'included' | 'not_included' | string;
  is_default?: boolean;
  active?: boolean;
}
