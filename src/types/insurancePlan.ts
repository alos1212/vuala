import type { Company } from "./company";
import type { Zone } from "./zone";
import type { AdditionalValue } from "./additionalValue";

export interface InsurancePlan {
    id: number;
    company_id: number;
    code: string;
    name: string;
    status: number;
    minimum_age: number;
    maximum_age: number;
    minimum_days: number;
    maximum_days: number;
    discount: number;
    category: string;
    for: string;
    value_of: string;
    value_per_day: number;
    cost_of: string;
    cost_value: number;
    currency: string;
    national: number;
    special: number;
    special_payment: number;
    deleted: number;
    coverage_value: number;
    relevance: number;
    comparatives?: Comparative[];
    origins: string;       // Arreglo de objetos GeoSelect para orígenes
    destinations: string; 
    exceptions?: string;
    promotions?: PlanPromotionForm[];
    increments?: Increment[];
    zones?: Zone[] | number[];
    pages?: number[];  // IDs de páginas (compañías)
    companies?: number[] | Company[]; // IDs de compañías o objetos con id y name
    additional_values?: AdditionalValue[];
}

export interface Comparative {
    id?: number;
    insurance_plan_id?:number;
    insurance_comparison_field_id:number;
    order?: number;
    value1: string | number;
    value2: string | number;
    text: string;
    text_en:string;

}

export interface PlanPromotion {
  id: number;
  insurance_promotion_id: number;
  date_from: string | null;
  date_to: string | null;
  min_days: number | null;
  max_days: number | null;
  origins: string[];
  pages: number[];
  apply_to_cost: boolean;
}

// versión para formularios (acepta strings mientras el usuario escribe)
export interface PlanPromotionForm extends Omit<PlanPromotion, "id" | "min_days" | "max_days"> {
  id: number | string;
  min_days?: number | string | null;
  max_days?: number | string | null;
}

export interface Increment {
  id?: number;
  age_from: number;
  age_to: number;
  percentage: number;
}
