import type { Agency } from "./agency";
import type { User } from "./auth";

export interface AgencyCrmCatalogItem {
  id: number;
  name: string;
  slug: string;
  color?: string | null;
  icon?: string | null;
  description?: string | null;
  sort_order?: number;
  is_active?: boolean;
  is_system?: boolean;
}

export interface AgencyCrmActivity {
  id: number;
  agency_id: number;
  management_type_id: number;
  result_type_id?: number | null;
  assigned_user_id?: number | null;
  created_by?: number | null;
  updated_by?: number | null;
  parent_activity_id?: number | null;
  subject: string;
  description?: string | null;
  status: "scheduled" | "completed" | "cancelled" | "rescheduled" | "pending";
  priority: "low" | "medium" | "high" | "urgent";
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  location_name?: string | null;
  address?: string | null;
  scheduled_start_at: string;
  scheduled_end_at?: string | null;
  completed_at?: string | null;
  follow_up_at?: string | null;
  requires_follow_up?: boolean;
  result_notes?: string | null;
  meta?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  agency?: Pick<Agency, "id" | "name">;
  management_type?: AgencyCrmCatalogItem;
  managementType?: AgencyCrmCatalogItem;
  result_type?: AgencyCrmCatalogItem | null;
  resultType?: AgencyCrmCatalogItem | null;
  assigned_user?: Pick<User, "id" | "name" | "email"> | null;
  assignedUser?: Pick<User, "id" | "name" | "email"> | null;
}

export interface AgencyCrmActivityPayload {
  agency_id: number;
  management_type_id: number;
  result_type_id?: number | null;
  assigned_user_id?: number | null;
  parent_activity_id?: number | null;
  subject: string;
  description?: string;
  status?: AgencyCrmActivity["status"];
  priority?: AgencyCrmActivity["priority"];
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  location_name?: string;
  address?: string;
  scheduled_start_at: string;
  scheduled_end_at?: string | null;
  completed_at?: string | null;
  follow_up_at?: string | null;
  requires_follow_up?: boolean;
  result_notes?: string;
}

export interface AgencyCrmDashboardSummary {
  totalActivities: number;
  scheduledActivities: number;
  pendingActivities: number;
  completedActivities: number;
  followUps: number;
  overdueActivities: number;
  upcomingActivities: AgencyCrmActivity[];
  todayActivities: AgencyCrmActivity[];
  topAgencies: Array<{
    agencyId: number;
    agencyName: string;
    count: number;
  }>;
}
