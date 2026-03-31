import type { TravelerDetail, TravelerPayload } from "./insurancePurchaseTraveler";
import type { PaymentDetail } from "./insurancePurchasePayment";

export interface InsuranceTravelerPlanDetail {
  purchaseId?: number | null;
  planId?: number | null;
  planName?: string | null;
  planTypeId?: string | number | null;
  planTypeName?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  originName?: string | null;
  originValue?: string | number | null;
  destinationName?: string | null;
  destinationValue?: string | number | null;
  currency?: string | null;
  exchangeRate?: string | null;
  amount?: string | null;
  cost?: string | null;
  previousCost?: string | null;
  otherCost?: string | null;
}

export interface InsuranceTravelerDetailResponse {
  traveler: TravelerDetail;
  plan: InsuranceTravelerPlanDetail | null;
  payments: PaymentDetail[];
}

export interface InsuranceTravelerUpdatePayload extends TravelerPayload {}

