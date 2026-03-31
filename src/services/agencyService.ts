import api from "../lib/axios";
import type { Agency, AgencyDetail } from "../types/agency";
import type { ApiResponse } from "../types/api";
import type { User } from "../types/auth";
import type { PaginatedResponse } from "../types/api";
import type { UserProfileWithPoints } from "../types/userPoints";

const toFormData = (payload: Partial<Agency>) => {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined) return;
    if (value === null) {
      fd.append(key, '');
      return;
    }
    if (typeof value === 'boolean') {
      fd.append(key, value ? '1' : '0');
      return;
    }
    if (value instanceof Blob) {
      const fileName = value instanceof File ? value.name : 'upload';
      fd.append(key, value, fileName);
      return;
    }
    fd.append(key, value as any);
  });
  return fd;
};

const hasFilePayload = (payload: Partial<Agency>) =>
  Object.values(payload).some((value) => value instanceof Blob);

export const agencyService = {
  getAgencies: async (): Promise<Agency[]> => {
    const { data } = await api.get("/agencies");
    // Soportar respuesta plana o envuelta en { data }
    return (data as any).data ?? data;
  },

  getAgenciesPaginated: async (params?: { page?: number; per_page?: number; search?: string }): Promise<PaginatedResponse<Agency>> => {
    const { data } = await api.get<PaginatedResponse<Agency>>("/agencies", { params });
    // Si viene envuelto en { data } como ApiResponse
    if ((data as any).data && Array.isArray((data as any).data.data)) {
      return (data as any).data as PaginatedResponse<Agency>;
    }
    return data;
  },

  getAgency: async (id: number): Promise<AgencyDetail> => {
    const { data } = await api.get(`/agencies/${id}`);
    return (data as any).data ?? data;
  },

  getMyAgency: async (): Promise<AgencyDetail> => {
    const { data } = await api.get('/my-agency');
    return (data as any).data ?? data;
  },

  createAgency: async (payload: Partial<Agency>): Promise<Agency> => {
    const body = hasFilePayload(payload) ? toFormData(payload) : payload;
    const { data } = await api.post<ApiResponse<Agency>>("/agencies", body, {
      headers: body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    });
    return (data as any).data ?? data;
  },

  updateAgency: async (id: number, payload: Partial<Agency>): Promise<Agency> => {
    const body = hasFilePayload(payload) ? toFormData(payload) : payload;
    const response = body instanceof FormData
      ? await (() => {
          if (!body.has('_method')) {
            body.append('_method', 'PUT');
          }
          return api.post<ApiResponse<Agency>>(`/agencies/${id}`, body, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        })()
      : await api.put<ApiResponse<Agency>>(`/agencies/${id}`, body);
    const data = response.data;
    return (data as any).data ?? data;
  },

  updateMyAgency: async (payload: Partial<Agency>): Promise<Agency> => {
    const body = hasFilePayload(payload) ? toFormData(payload) : payload;
    const response = body instanceof FormData
      ? await (() => {
          if (!body.has('_method')) {
            body.append('_method', 'PUT');
          }
          return api.post<ApiResponse<Agency>>('/my-agency', body, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
        })()
      : await api.put<ApiResponse<Agency>>('/my-agency', body);
    const data = response.data;
    return (data as any).data ?? data;
  },

  deleteAgency: async (id: number): Promise<void> => {
    await api.delete(`/agencies/${id}`);
  },

  getAgencyUsers: async (agencyId: number): Promise<User[]> => {
    const { data } = await api.get(`/agencies/${agencyId}/users`);
    return (data as any).data ?? data;
  },

  getMyAgencyUsers: async (): Promise<User[]> => {
    const { data } = await api.get('/my-agency/users');
    return (data as any).data ?? data;
  },

  getAgencyPlans: async (agencyId: number) => {
    const { data } = await api.get(`/agencies/${agencyId}/plans`);
    return (data as any).data ?? data;
  },

  saveAgencyPlanCommission: async (
    agencyId: number,
    payload: {
      insurance_plan_id: number;
      commission_type?: 'included' | 'not_included';
      commission_value?: number;
      additional_value_id?: number;
      active?: boolean;
    }
  ) => {
    const { data } = await api.post(`/agencies/${agencyId}/plans`, payload);
    return (data as any).data ?? data;
  },

  createAgencyUser: async (agencyId: number, payload: any): Promise<User> => {
    const { data } = await api.post<ApiResponse<User>>(`/agencies/${agencyId}/users`, payload);
    return data.data;
  },

  createMyAgencyUser: async (payload: any): Promise<User> => {
    const { data } = await api.post<ApiResponse<User>>('/my-agency/users', payload);
    return data.data;
  },

  updateAgencyUser: async (agencyId: number, userId: number, payload: any): Promise<User> => {
    const { data } = await api.put<ApiResponse<User>>(`/agencies/${agencyId}/users/${userId}`, payload);
    return data.data;
  },

  updateMyAgencyUser: async (userId: number, payload: any): Promise<User> => {
    const { data } = await api.put<ApiResponse<User>>(`/my-agency/users/${userId}`, payload);
    return data.data;
  },

  deleteAgencyUser: async (agencyId: number, userId: number): Promise<void> => {
    await api.delete(`/agencies/${agencyId}/users/${userId}`);
  },

  deleteMyAgencyUser: async (userId: number): Promise<void> => {
    await api.delete(`/my-agency/users/${userId}`);
  },

  getAgencyUserProfileWithPoints: async (
    agencyId: number,
    userId: number,
    params?: { page?: number; per_page?: number }
  ): Promise<UserProfileWithPoints> => {
    const { data } = await api.get<ApiResponse<UserProfileWithPoints>>(`/agencies/${agencyId}/users/${userId}/profile`, { params });
    return data.data;
  },

  getMyAgencyUserProfileWithPoints: async (
    userId: number,
    params?: { page?: number; per_page?: number }
  ): Promise<UserProfileWithPoints> => {
    const { data } = await api.get<ApiResponse<UserProfileWithPoints>>(`/my-agency/users/${userId}/profile`, { params });
    return data.data;
  },
};
