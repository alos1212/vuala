export interface TravelerPayload {
  id?: number;
  index: number;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  birthDate: string;
  age?: number | null;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  country?: string;
  canceled?: boolean | number;
  canceledAt?: string | null;
    voucher?: string | null;
}

export interface TravelerDetail extends TravelerPayload {
  id: number;
  purchaseId: number;
  value?: string | null;
  previousValue?: string | null;
  promotionText?: string | null;
  incrementValue?: string | null;
  voucher?: string | null;
  issuedAt?: string | null;
  canceled?: boolean | number;
  canceledAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}
