import type { PaymentPayload } from "./insurancePurchasePayment";
import type { TravelerPayload } from "./insurancePurchaseTraveler";

export interface CheckoutPayload {
  originName?: string;
  originValue?: string | number | null;
  destinationName?: string;
  destinationValue?: string | number | null;
  startDate?: string;
  endDate?: string;
  passengerCount: number;
  emergencyContactName: string;
  emergencyContactPhone: string;
  planId: number | null;
  planName: string | null;
  planTypeId: string | number | null;
  planTypeName: string | null;
  currency?: "COP" | "USD" | null;
  exchangeRate?: number | null;
  travelers: TravelerPayload[];
  payment: PaymentPayload;
  agency?: string | number | null;
  agentId?: number | null;
  page?: string | number | null;
}
