import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BiCalendar, BiCheckCircle, BiGroup, BiListUl, BiPlus, BiTimeFive } from "react-icons/bi";
import { agencyCrmService } from "../../services/agencyCrmService";
import { agencyService } from "../../services/agencyService";
import type { AgencyCrmActivity } from "../../types/agencyCrm";
import type { Agency } from "../../types/agency";
import { useAuthStore } from "../../stores/authStore";

const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const statusClass: Record<string, string> = {
  scheduled: "badge-info",
  pending: "badge-warning",
  completed: "badge-success",
  cancelled: "badge-ghost",
  rescheduled: "badge-primary",
};

const ActivityMiniCard: React.FC<{ activity: AgencyCrmActivity }> = ({ activity }) => (
  <div className="rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <h3 className="font-semibold text-base-content">{activity.subject}</h3>
        <p className="text-sm text-base-content/60">{activity.agency?.name ?? `Agencia #${activity.agency_id}`}</p>
      </div>
      <span className={`badge ${statusClass[activity.status] ?? "badge-ghost"}`}>{activity.status}</span>
    </div>
    <div className="mt-3 text-sm text-base-content/70 space-y-1">
      <div>{activity.managementType?.name ?? "Gestion"}</div>
      <div>{formatDateTime(activity.scheduled_start_at)}</div>
      <div>{activity.assignedUser?.name ?? "Sin responsable"}</div>
    </div>
  </div>
);

const AgencyCrmDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canSeeAllCrm = hasPermission("agencies.list") || hasPermission("agency-crm.catalogs.list");

  const { data: agencies = [] } = useQuery<Agency[]>({
    queryKey: ["agency-crm", "dashboard", "agencies"],
    queryFn: () => agencyService.getAgencies(),
    refetchOnWindowFocus: false,
  });

  const accessibleAgencies = useMemo(() => {
    if (canSeeAllCrm) return agencies;
    return agencies.filter((agency) => {
      if (user?.agency_id && agency.id === user.agency_id) return true;
      return agency.manager_user_id === user?.id;
    });
  }, [agencies, canSeeAllCrm, user?.agency_id, user?.id]);

  const accessibleAgencyIds = useMemo(() => new Set(accessibleAgencies.map((agency) => agency.id)), [accessibleAgencies]);

  const { data, isLoading } = useQuery({
    queryKey: ["agency-crm", "dashboard", canSeeAllCrm, user?.id, accessibleAgencies.map((agency) => agency.id).join(",")],
    queryFn: async () => {
      const summary = await agencyCrmService.getDashboardSummary();

      if (canSeeAllCrm) {
        return summary;
      }

      const filterActivities = (activities: AgencyCrmActivity[]) =>
        activities.filter((activity) => {
          const agencyId = activity.agency?.id ?? activity.agency_id;
          const assignedUserId = activity.assignedUser?.id ?? activity.assigned_user_id;
          return accessibleAgencyIds.has(agencyId) && assignedUserId === user?.id;
        });

      const upcomingActivities = filterActivities(summary.upcomingActivities ?? []);
      const todayActivities = filterActivities(summary.todayActivities ?? []);
      const combined = [...upcomingActivities, ...todayActivities];
      const topAgenciesMap = new Map<number, { agencyId: number; agencyName: string; count: number }>();

      combined.forEach((activity) => {
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
        ...summary,
        totalActivities: combined.length,
        scheduledActivities: combined.filter((item) => item.status === "scheduled").length,
        pendingActivities: combined.filter((item) => item.status === "pending").length,
        completedActivities: combined.filter((item) => item.status === "completed").length,
        followUps: combined.filter((item) => item.requires_follow_up).length,
        overdueActivities: combined.filter((item) => new Date(item.scheduled_start_at).getTime() < Date.now() && item.status !== "completed").length,
        upcomingActivities,
        todayActivities,
        topAgencies: Array.from(topAgenciesMap.values()).sort((a, b) => b.count - a.count),
      };
    },
    enabled: canSeeAllCrm || accessibleAgencies.length > 0,
    refetchOnWindowFocus: false,
  });

  const stats = [
    { label: "Total gestiones", value: data?.totalActivities ?? 0, icon: BiListUl, tone: "text-primary" },
    { label: "Programadas", value: data?.scheduledActivities ?? 0, icon: BiCalendar, tone: "text-info" },
    { label: "Pendientes", value: data?.pendingActivities ?? 0, icon: BiTimeFive, tone: "text-warning" },
    { label: "Completadas", value: data?.completedActivities ?? 0, icon: BiCheckCircle, tone: "text-success" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-base-content">CRM de Agencias</h1>
          <p className="text-base-content/60">Resumen comercial, agenda de visitas y seguimiento de gestiones por agencia.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-outline" onClick={() => navigate("/crm/gestiones")}>
            <BiListUl className="h-5 w-5" />
            Ver gestiones
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/crm/gestiones?nueva=1")}>
            <BiPlus className="h-5 w-5" />
            Nueva gestion
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-base-content/60">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-base-content">{isLoading ? "..." : stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 ${stat.tone}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <section className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Proximas gestiones</h2>
            <p className="text-sm text-base-content/60">Actividades programadas para hoy y los proximos dias.</p>
          </div>
          {isLoading ? (
            <div className="py-16 text-center"><span className="loading loading-spinner loading-lg" /></div>
          ) : data?.upcomingActivities?.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {data.upcomingActivities.map((activity) => (
                <ActivityMiniCard key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-base-300 p-10 text-center text-base-content/60">
              No hay gestiones proximas registradas.
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
            <h2 className="text-xl font-semibold">Seguimientos clave</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl bg-base-200/50 px-4 py-3">
                <span className="text-sm text-base-content/70">Requieren seguimiento</span>
                <span className="font-semibold">{data?.followUps ?? 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-base-200/50 px-4 py-3">
                <span className="text-sm text-base-content/70">Vencidas</span>
                <span className="font-semibold">{data?.overdueActivities ?? 0}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-base-200/50 px-4 py-3">
                <span className="text-sm text-base-content/70">Para hoy</span>
                <span className="font-semibold">{data?.todayActivities?.length ?? 0}</span>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <BiGroup className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-semibold">Agencias con mas gestion</h2>
            </div>
            <div className="mt-4 space-y-3">
              {data?.topAgencies?.length ? (
                data.topAgencies.map((item) => (
                  <div key={item.agencyId} className="flex items-center justify-between rounded-2xl border border-base-200 px-4 py-3">
                    <span className="text-sm font-medium">{item.agencyName}</span>
                    <span className="badge badge-primary badge-outline">{item.count}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-base-content/60">Aun no hay gestiones suficientes para mostrar ranking.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AgencyCrmDashboardPage;
