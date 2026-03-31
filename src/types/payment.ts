export type WompiMethod =
  | "CARD"
  | "BANCOLOMBIA_TRANSFER"
  | "CASH"
  | "NEQUI"
  | "PSE";

export type PaymentSelection =
  | { platform: "agency"; agencyCode: number | string | null }
  | { platform: "wompi"; method: WompiMethod; billingEmail?: string; data?: Record<string, string> };
