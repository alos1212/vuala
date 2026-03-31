import api from "../lib/axios";

export interface ExchangeRateCurrentData {
  organization_id?: number | null;
  currency: string;
  value: number;
  date?: string | null;
}

export const exchangeRateService = {
  getCurrent: async (params?: { currency?: string; organization_id?: number | null; force?: boolean }): Promise<ExchangeRateCurrentData> => {
    const { data } = await api.get("/exchange-rate/current", { params });
    return (data as any)?.data;
  },
  getCurrentByOrganization: async (
    organizationId: number | string,
    params?: { currency?: string; force?: boolean },
  ): Promise<ExchangeRateCurrentData> => {
    const { data } = await api.get(`/exchange-rate/organization/${organizationId}`, { params });
    return (data as any)?.data;
  },
};
