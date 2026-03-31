export interface AdditionalCost {
  id: number;
  insurance_plan_id: number;
  company_id: number;
  name: string;
  cost_type: number | string;
  cost_value: number;
  currency: string;
  active: boolean;
  company?: {
    id: number;
    name: string;
  };
}

export interface AdditionalCostPayload {
  company_id: number | string;
  name: string;
  cost_type: number | string;
  cost_value: number | string;
  currency: string;
  active?: boolean;
}
