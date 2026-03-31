import api from "../lib/axios";
import type { CheckoutPayload } from "../types/insurancePurchase";
import type { InsurancePurchaseResponse } from "../types/insurancePurchaseResponse";
import type { InsurancePurchaseDetail } from "../types/insurancePurchaseDetail";
import type { TravelerPayload, TravelerDetail } from "../types/insurancePurchaseTraveler";
import type { InsuranceTravelerDetailResponse, InsuranceTravelerPlanDetail } from "../types/insuranceTravelerDetail";
import type { PaginatedResponse } from "../types/api";
import type { InsurancePurchaseListItem, InsuranceTravelerListItem } from "../types/insurancePurchaseList";
import type { PaymentDetail } from "../types/insurancePurchasePayment";
import type { Agency } from "../types/agency";

export interface InsuranceAgencyAgent {
  id: number;
  name: string;
  email?: string | null;
  agency_id?: number | null;
}

export interface CurrentExchangeRateData {
  organization_id?: number | null;
  currency: string;
  value: number;
  date?: string | null;
}

const mapTraveler = (traveler: any): TravelerDetail => ({
  id: traveler.id,
  purchaseId: traveler.purchase_id,
  index: traveler.index,
  firstName: traveler.first_name,
  lastName: traveler.last_name,
  documentType: traveler.document_type,
  documentNumber: traveler.document_number,
  birthDate: traveler.birth_date,
  age: traveler.age,
  phone: traveler.phone,
  email: traveler.email,
  address: traveler.address,
  city: traveler.city,
  country: traveler.country,
  value: traveler.value,
  previousValue: traveler.previous_value,
  promotionText: traveler.promotion_text,
  incrementValue: traveler.increment_value,
  voucher: traveler.voucher,
  issuedAt: traveler.issued_at,
  canceled: Boolean(traveler.canceled),
  canceledAt: traveler.canceled_at,
  createdAt: traveler.created_at,
  updatedAt: traveler.updated_at,
});

const mapPayment = (payment: any): PaymentDetail => ({
  id: payment.id,
  payableType: payment.payable_type,
  payableId: payment.payable_id,
  platform: payment.platform,
  method: payment.method,
  status: payment.status,
  currency: payment.currency,
  exchangeRate: payment.exchange_rate,
  amount: payment.amount,
  fee: payment.fee,
  netAmount: payment.net_amount,
  reference: payment.reference,
  externalReference: payment.external_reference,
  additionalData: payment.additional_data,
  agencyCode: payment.agency_code,
  priceOption: payment.price_option,
  meta: payment.meta,
  paidAt: payment.paid_at,
  canceledAt: payment.canceled_at,
  dueAt: payment.due_at,
  createdAt: payment.created_at,
  updatedAt: payment.updated_at,
});

const mapPurchase = (data: any): InsurancePurchaseDetail => ({
  id: data.id,
  originName: data.origin_name,
  originValue: data.origin_value,
  destinationName: data.destination_name,
  destinationValue: data.destination_value,
  startDate: data.start_date,
  endDate: data.end_date,
  passengerCount: data.passenger_count,
  emergencyContactName: data.emergency_contact_name,
  emergencyContactPhone: data.emergency_contact_phone,
  planId: data.plan_id,
  planName: data.plan_name,
  planTypeId: data.plan_type_id,
  planTypeName: data.plan_type_name,
  amount: data.amount,
  cost: data.cost,
  otherCost: data.other_cost,
  previousCost: data.previous_cost,
  commissionValue: data.commission_value ?? null,
  commissionPercent: data.commission_percent ?? null,
  commissionType: data.commission_type ?? null,
  currency: data.currency,
  exchangeRate: data.exchange_rate,
  agency: data.agency,
  agencyName: data.agency_name ?? null,
  agentId: data.agent_id ?? null,
  agentName: data.agent_name ?? null,
  page: data.page,
  pageName: data.page_name ?? null,
  planCompanyName: data.plan_company_name ?? null,
  createdAt: data.created_at,
  updatedAt: data.updated_at,
  travelers: Array.isArray(data.travelers) ? data.travelers.map(mapTraveler) : [],
  payments: Array.isArray(data.payments) ? data.payments.map(mapPayment) : [],
});

export const insurancePurchaseService = {
  create: async (payload: CheckoutPayload): Promise<InsurancePurchaseResponse> => {
    const { data } = await api.post<InsurancePurchaseResponse>("/insurance/purchases", payload);
    return data;
  },
  listPurchases: async (filters: Record<string, string | number | undefined> = {}): Promise<PaginatedResponse<InsurancePurchaseListItem>> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value != null && value !== "") params.append(key, String(value));
    });
    const { data } = await api.get<PaginatedResponse<InsurancePurchaseListItem>>(`/insurance/purchases${params.toString() ? `?${params.toString()}` : ""}`);
    return data;
  },
  listTravelers: async (filters: Record<string, string | number | undefined> = {}): Promise<PaginatedResponse<InsuranceTravelerListItem>> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value != null && value !== "") params.append(key, String(value));
    });
    const { data } = await api.get<PaginatedResponse<InsuranceTravelerListItem>>(`/insurance/travelers${params.toString() ? `?${params.toString()}` : ""}`);
    return data;
  },
  getCurrentExchangeRate: async (params?: { currency?: string; organization_id?: number | null; force?: boolean }): Promise<CurrentExchangeRateData> => {
    const { data } = await api.get("/exchange-rate/current", { params });
    return (data as any)?.data;
  },
  listAgenciesForAssignment: async (): Promise<Pick<Agency, "id" | "name">[]> => {
    const { data } = await api.get("/insurance/agencies/options");
    return (data as any)?.data ?? [];
  },
  listAgencyAgents: async (agencyId: number | string): Promise<InsuranceAgencyAgent[]> => {
    const { data } = await api.get(`/insurance/agencies/${agencyId}/agents`);
    return (data as any)?.data ?? [];
  },
  get: async (id: number | string): Promise<InsurancePurchaseDetail> => {
    const { data } = await api.get(`/insurance/purchases/${id}`);
    return mapPurchase(data);
  },
  update: async (id: number | string, payload: CheckoutPayload): Promise<InsurancePurchaseDetail> => {
    const { data } = await api.put(`/insurance/purchases/${id}`, payload);
    return mapPurchase(data);
  },
  getTraveler: async (id: number | string): Promise<InsuranceTravelerDetailResponse> => {
    const { data } = await api.get(`/insurance/travelers/${id}`);
    const traveler = mapTraveler(data?.traveler ?? data);
    const plan: InsuranceTravelerPlanDetail | null = data?.plan
      ? {
          purchaseId: data.plan.purchase_id ?? null,
          planId: data.plan.plan_id ?? null,
          planName: data.plan.plan_name ?? null,
          planTypeId: data.plan.plan_type_id ?? null,
          planTypeName: data.plan.plan_type_name ?? null,
          startDate: data.plan.start_date ?? null,
          endDate: data.plan.end_date ?? null,
          originName: data.plan.origin_name ?? null,
          originValue: data.plan.origin_value ?? null,
          destinationName: data.plan.destination_name ?? null,
          destinationValue: data.plan.destination_value ?? null,
          currency: data.plan.currency ?? null,
          exchangeRate: data.plan.exchange_rate ?? null,
          amount: data.plan.amount ?? null,
          cost: data.plan.cost ?? null,
          previousCost: data.plan.previous_cost ?? null,
          otherCost: data.plan.other_cost ?? null,
        }
      : null;
    const payments = Array.isArray(data?.payment) ? data.payment.map(mapPayment) : [];
    return { traveler, plan, payments };
  },
  updateTraveler: async (id: number | string, payload: TravelerPayload): Promise<InsuranceTravelerDetailResponse> => {
    const body: Record<string, unknown> = {
      index: payload.index,
      first_name: payload.firstName,
      last_name: payload.lastName,
      document_type: payload.documentType,
      document_number: payload.documentNumber,
      birth_date: payload.birthDate,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      address: payload.address ?? null,
      city: payload.city ?? null,
      country: payload.country ?? null,
      voucher: payload.voucher ?? null,
      canceled: payload.canceled ?? 0,
      canceled_at: payload.canceledAt ?? null,
    };
    if (payload.id != null) body.id = payload.id;
    const { data } = await api.put(`/insurance/travelers/${id}`, body);
    const traveler = mapTraveler(data?.traveler ?? data);
    const plan: InsuranceTravelerPlanDetail | null = data?.plan
      ? {
          purchaseId: data.plan.purchase_id ?? null,
          planId: data.plan.plan_id ?? null,
          planName: data.plan.plan_name ?? null,
          planTypeId: data.plan.plan_type_id ?? null,
          planTypeName: data.plan.plan_type_name ?? null,
          startDate: data.plan.start_date ?? null,
          endDate: data.plan.end_date ?? null,
          originName: data.plan.origin_name ?? null,
          originValue: data.plan.origin_value ?? null,
          destinationName: data.plan.destination_name ?? null,
          destinationValue: data.plan.destination_value ?? null,
          currency: data.plan.currency ?? null,
          exchangeRate: data.plan.exchange_rate ?? null,
          amount: data.plan.amount ?? null,
          cost: data.plan.cost ?? null,
          previousCost: data.plan.previous_cost ?? null,
          otherCost: data.plan.other_cost ?? null,
        }
      : null;
    const payments = Array.isArray(data?.payment) ? data.payment.map(mapPayment) : [];
    return { traveler, plan, payments };
  },
};
