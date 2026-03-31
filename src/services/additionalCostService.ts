import api from '../lib/axios';
import type { AdditionalCost, AdditionalCostPayload } from '../types/additionalCost';

export const additionalCostService = {
  listByPlan: async (planId: number): Promise<AdditionalCost[]> => {
    const response = await api.get<{ success: boolean; data: AdditionalCost[] }>(`/insurance-plans/${planId}/additional-costs`);
    return response.data.data ?? [];
  },
  create: async (planId: number, payload: AdditionalCostPayload): Promise<AdditionalCost> => {
    const response = await api.post<{ success: boolean; data: AdditionalCost }>(
      `/insurance-plans/${planId}/additional-costs`,
      payload
    );
    return response.data.data;
  },
  update: async (id: number, payload: AdditionalCostPayload): Promise<AdditionalCost> => {
    const response = await api.put<{ success: boolean; data: AdditionalCost }>(
      `/insurance-plan-additional-costs/${id}`,
      payload
    );
    return response.data.data;
  },
  delete: async (id: number): Promise<void> => {
    await api.delete(`/insurance-plan-additional-costs/${id}`);
  },
};
