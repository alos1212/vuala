export type PaymentSelectionWompi = {
  method: string;
  billingEmail?: string;
  data: Record<string, string>;
};

export type AgencyPaymentPayload = { platform: "agency"; agencyCode: number | null };
export type WompiPaymentPayload = { platform: "wompi" } & PaymentSelectionWompi;

export type PaymentPayloadBase = AgencyPaymentPayload | WompiPaymentPayload;

type PaymentSettlementPayload = {
  priceOption: "public" | "net";
  currency?: "COP" | "USD";
  exchangeRate?: number | null;
};

export type PaymentPayload =
  | (AgencyPaymentPayload & PaymentSettlementPayload)
  | (WompiPaymentPayload & PaymentSettlementPayload);

export interface PaymentDetail {
  id: number;
  payableType: string;
  payableId: number;
  platform: string;
  method: string | null;
  status: string | null;
  currency: string | null;
  exchangeRate: string | null;
  amount: string | null;
  fee: string | null;
  netAmount: string | null;
  reference: string | null;
  externalReference: string | null;
  additionalData?: Record<string, unknown> | null;
  agencyCode?: number | null;
  priceOption?: string | null;
  meta?: Record<string, unknown> | null;
  paidAt?: string | null;
  canceledAt?: string | null;
  dueAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
