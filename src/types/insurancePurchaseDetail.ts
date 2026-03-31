import type { TravelerDetail } from "./insurancePurchaseTraveler";
import type { PaymentDetail } from "./insurancePurchasePayment";

export interface InsurancePurchaseDetail {
  id: number;
  originName: string | null;
  originValue: string | number | null;
  destinationName: string | null;
  destinationValue: string | number | null;
  startDate: string | null;
  endDate: string | null;
  passengerCount: number;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  planId: number | null;
  planName: string | null;
  planTypeId: string | number | null;
  planTypeName: string | null;
  amount: string | null;
  cost: string | null;
  otherCost: string | null;
  previousCost: string | null;
  commissionValue?: string | number | null;
  commissionPercent?: string | number | null;
  commissionType?: string | null;
  currency: string | null;
  exchangeRate: string | null;
  agency: string | number | null;
  agencyName?: string | null;
  agentId?: number | null;
  agentName?: string | null;
  page: string | number | null;
  pageName?: string | null;
  planCompanyName?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  travelers: TravelerDetail[];
  payments: PaymentDetail[];
}
