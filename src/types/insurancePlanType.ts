// src/types/insurancePlanType.ts
export type PlanPeriodicity = 'day' | 'month' | 'year';
export type PlanGeoScope = 'international' | 'national';

export interface InsurancePlanType {
  id: number;
  name: string;
  deletable: boolean;
  periodicity: PlanPeriodicity;
  geo_scope: PlanGeoScope;
  created_at?: string;
  updated_at?: string;
}
