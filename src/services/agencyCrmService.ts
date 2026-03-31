import api from "../lib/axios";
import type { PaginatedResponse } from "../types/api";
import type {
  AgencyCrmActivity,
  AgencyCrmActivityPayload,
  AgencyCrmCatalogItem,
  AgencyCrmDashboardSummary,
} from "../types/agencyCrm";

type ActivityFilters = {
  page?: number;
  per_page?: number;
  search?: string;
  agency_id?: number;
  assigned_user_id?: number;
  management_type_id?: number;
  result_type_id?: number;
  status?: string;
  priority?: string;
  date_from?: string;
  date_to?: string;
};

const unwrap = <T>(payload: any): T => payload?.data ?? payload;

const normalizePagination = <T>(payload: any): PaginatedResponse<T> => {
  const raw = payload?.data && Array.isArray(payload.data?.data) ? payload.data : payload;

  return {
    data: Array.isArray(raw?.data) ? raw.data : [],
    meta: raw?.meta ?? {
      current_page: Number(raw?.current_page ?? 1),
      last_page: Number(raw?.last_page ?? 1),
      per_page: Number(raw?.per_page ?? 0),
      total: Number(raw?.total ?? 0),
      from: raw?.from,
      to: raw?.to,
    },
    links: raw?.links ?? {
      first: "",
      last: "",
      prev: null,
      next: null,
    },
  };
};

export const agencyCrmService = {
  async getManagementTypes(): Promise<AgencyCrmCatalogItem[]> {
    const { data } = await api.get("/agency-crm/types");
    return unwrap<AgencyCrmCatalogItem[]>(data);
  },

  async getResultTypes(): Promise<AgencyCrmCatalogItem[]> {
    const { data } = await api.get("/agency-crm/results");
    return unwrap<AgencyCrmCatalogItem[]>(data);
  },

  async getActivities(filters?: ActivityFilters): Promise<PaginatedResponse<AgencyCrmActivity>> {
    const { data } = await api.get("/agency-crm/activities", { params: filters });
    return normalizePagination<AgencyCrmActivity>(data);
  },

  async getCalendar(filters?: Omit<ActivityFilters, "page" | "per_page">): Promise<AgencyCrmActivity[]> {
    const { data } = await api.get("/agency-crm/activities/calendar", { params: filters });
    return unwrap<AgencyCrmActivity[]>(data);
  },

  async getActivity(id: number): Promise<AgencyCrmActivity> {
    const { data } = await api.get(`/agency-crm/activities/${id}`);
    return unwrap<AgencyCrmActivity>(data);
  },

  async createActivity(payload: AgencyCrmActivityPayload): Promise<AgencyCrmActivity> {
    const { data } = await api.post("/agency-crm/activities", payload);
    return unwrap<AgencyCrmActivity>(data);
  },

  async updateActivity(id: number, payload: Partial<AgencyCrmActivityPayload>): Promise<AgencyCrmActivity> {
    const { data } = await api.put(`/agency-crm/activities/${id}`, payload);
    return unwrap<AgencyCrmActivity>(data);
  },

  async deleteActivity(id: number): Promise<void> {
    await api.delete(`/agency-crm/activities/${id}`);
  },

  async getDashboardSummary(): Promise<AgencyCrmDashboardSummary> {
    const [upcomingActivities, todayActivities, allActivities] = await Promise.all([
      this.getCalendar({
        date_from: new Date().toISOString().slice(0, 10),
        date_to: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10),
      }),
      this.getCalendar({
        date_from: new Date().toISOString().slice(0, 10),
        date_to: new Date().toISOString().slice(0, 10),
      }),
      this.getActivities({ per_page: 200 }),
    ]);

    const rows = allActivities.data ?? [];
    const now = Date.now();
    const topAgenciesMap = new Map<number, { agencyId: number; agencyName: string; count: number }>();

    rows.forEach((activity) => {
      const agencyId = activity.agency?.id ?? activity.agency_id;
      const agencyName = activity.agency?.name ?? `Agencia #${agencyId}`;
      const existing = topAgenciesMap.get(agencyId);

      if (existing) {
        existing.count += 1;
      } else {
        topAgenciesMap.set(agencyId, { agencyId, agencyName, count: 1 });
      }
    });

    return {
      totalActivities: rows.length,
      scheduledActivities: rows.filter((item) => item.status === "scheduled").length,
      pendingActivities: rows.filter((item) => item.status === "pending").length,
      completedActivities: rows.filter((item) => item.status === "completed").length,
      followUps: rows.filter((item) => item.requires_follow_up).length,
      overdueActivities: rows.filter((item) => {
        const scheduledAt = Date.parse(item.scheduled_start_at);
        return item.status !== "completed" && !Number.isNaN(scheduledAt) && scheduledAt < now;
      }).length,
      upcomingActivities: upcomingActivities.slice(0, 8),
      todayActivities,
      topAgencies: Array.from(topAgenciesMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  },
};
