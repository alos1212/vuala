import api from '../lib/axios';
import type { AdditionalValue, AdditionalValuePayload } from '../types/additionalValue';

export const additionalValueService = {
  listByPlan: async (planId: number): Promise<AdditionalValue[]> => {
    const response = await api.get<{ success: boolean; data: AdditionalValue[] }>(`/insurance-plans/${planId}/additional-values`);
    return response.data.data ?? [];
  },
  create: async (planId: number, payload: AdditionalValuePayload): Promise<AdditionalValue> => {
    const response = await api.post<{ success: boolean; data: AdditionalValue }>(
      `/insurance-plans/${planId}/additional-values`,
      payload
    );
    return response.data.data;
  },
  update: async (id: number, payload: AdditionalValuePayload): Promise<AdditionalValue> => {
    const response = await api.put<{ success: boolean; data: AdditionalValue }>(
      `/insurance-plan-additional-values/${id}`,
      payload
    );
    return response.data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/insurance-plan-additional-values/${id}`);
  },
};
