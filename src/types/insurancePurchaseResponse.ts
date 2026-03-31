export interface InsurancePurchaseResponse {
  success?: boolean;
  message?: string;
  id?: number | string;
  purchaseId?: number | string;
  redirectUrl?: string;
  redirect_url?: string;
  [key: string]: unknown;
}
