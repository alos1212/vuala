import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { BiFilterAlt, BiPencil, BiPlus, BiTrash } from "react-icons/bi";
import Select from "react-select";
import { agencyCrmService } from "../../services/agencyCrmService";
import { agencyService } from "../../services/agencyService";
import { geoService } from "../../services/geoService";
import { userService } from "../../services/userService";
import type { Agency } from "../../types/agency";
import type { User } from "../../types/auth";
import type { AgencyCrmActivity } from "../../types/agencyCrm";
import { useAuthStore } from "../../stores/authStore";
import { useNavigate } from "react-router-dom";
import type { City } from "../../types/zone";

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

const AgencyCrmTasksPage: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [filters, setFilters] = useState({
    search: "",
    agency_id: "",
    assigned_user_id: "",
    city_id: "",
    status: "",
    priority: "",
    date_from: "",
    date_to: "",
  });

  const canSeeAllCrm = hasPermission("agencies.list") || hasPermission("agency-crm.catalogs.list");

  const { data: agencies = [] } = useQuery<Agency[]>({
    queryKey: ["agency-crm", "agencies"],
    queryFn: () => agencyService.getAgencies(),
    refetchOnWindowFocus: false,
  });

  const { data: managers = [] } = useQuery<User[]>({
    queryKey: ["agency-crm", "managers"],
    queryFn: () => userService.getAgencyManagers(),
    refetchOnWindowFocus: false,
  });

  const accessibleAgencies = useMemo(() => {
    if (canSeeAllCrm) return agencies;
    return agencies.filter((agency) => {
      if (user?.agency_id && agency.id === user.agency_id) return true;
      return agency.manager_user_id === user?.id;
    });
  }, [agencies, canSeeAllCrm, user?.agency_id, user?.id]);

  const managerOptions = useMemo(() => {
    const source = canSeeAllCrm ? managers : managers.filter((manager) => manager.id === user?.id);
    return source.map((manager) => ({
      value: manager.id,
      label: manager.name,
    }));
  }, [canSeeAllCrm, managers, user?.id]);

  const uniqueCountryIds = useMemo(
    () =>
      Array.from(
        new Set(
          accessibleAgencies
            .map((agency) => agency.country_id)
            .filter((countryId): countryId is number => Number.isFinite(countryId ?? NaN))
        )
      ),
    [accessibleAgencies]
  );

  const { data: cities = [] } = useQuery<City[]>({
    queryKey: ["agency-crm", "cities", uniqueCountryIds],
    queryFn: async () => {
      const responses = await Promise.all(uniqueCountryIds.map((countryId) => geoService.getCitiesByCountry(countryId)));
      const flat = responses.flat();
      const deduped = new Map<number, City>();
      flat.forEach((city) => {
        deduped.set(city.id, city);
      });
      return Array.from(deduped.values());
    },
    enabled: uniqueCountryIds.length > 0,
    refetchOnWindowFocus: false,
  });

  const cityMap = useMemo(() => {
    const map = new Map<number, City>();
    cities.forEach((city) => map.set(city.id, city));
    return map;
  }, [cities]);

  const agencyOptions = useMemo(
    () =>
      accessibleAgencies.map((agency) => ({
        value: agency.id,
        label: agency.name,
      })),
    [accessibleAgencies]
  );

  const cityOptions = useMemo(
    () =>
      cities
        .filter((city) => accessibleAgencies.some((agency) => agency.city_id === city.id))
        .map((city) => ({
          value: city.id,
          label: city.name,
        })),
    [accessibleAgencies, cities]
  );

  const activityFilters = useMemo(() => ({
    per_page: 100,
    search: filters.search || undefined,
    agency_id: filters.agency_id ? Number(filters.agency_id) : undefined,
    assigned_user_id: canSeeAllCrm
      ? (filters.assigned_user_id ? Number(filters.assigned_user_id) : undefined)
      : user?.id,
    status: filters.status || undefined,
    priority: filters.priority || undefined,
    date_from: filters.date_from || undefined,
    date_to: filters.date_to || undefined,
  }), [canSeeAllCrm, filters, user?.id]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["agency-crm", "activities", activityFilters],
    queryFn: () => agencyCrmService.getActivities(activityFilters),
    refetchOnWindowFocus: false,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => agencyCrmService.deleteActivity(id),
    onSuccess: () => {
      toast.success("Gestion eliminada correctamente");
      queryClient.invalidateQueries({ queryKey: ["agency-crm", "activities"] });
      queryClient.invalidateQueries({ queryKey: ["agency-crm", "dashboard"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "No se pudo eliminar la gestion");
    },
  });

  const accessibleAgencyIds = useMemo(() => new Set(accessibleAgencies.map((agency) => agency.id)), [accessibleAgencies]);
  const allAgencyFilterOptions = useMemo(() => [{ value: "", label: "Todas las agencias" }, ...agencyOptions], [agencyOptions]);
  const allManagerFilterOptions = useMemo(() => [{ value: "", label: "Todos los encargados" }, ...managerOptions], [managerOptions]);
  const allCityFilterOptions = useMemo(() => [{ value: "", label: "Todas las ciudades" }, ...cityOptions], [cityOptions]);
  const activities = useMemo(() => {
    const rows = data?.data ?? [];

    return rows.filter((activity) => {
      const agencyId = activity.agency?.id ?? activity.agency_id;
      const cityId = accessibleAgencies.find((agency) => agency.id === agencyId)?.city_id;
      const assignedUserId = activity.assignedUser?.id ?? activity.assigned_user_id;

      if (!canSeeAllCrm) {
        if (!accessibleAgencyIds.has(agencyId)) return false;
        if (user?.id && assignedUserId !== user.id) return false;
      }

      if (filters.city_id && cityId !== Number(filters.city_id)) return false;

      return true;
    });
  }, [accessibleAgencies, accessibleAgencyIds, canSeeAllCrm, data?.data, filters.city_id, user?.id]);

  const handleDelete = (activity: AgencyCrmActivity) => {
    if (!window.confirm(`¿Eliminar la gestion "${activity.subject}"?`)) return;
    deleteMutation.mutate(activity.id);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-base-content">Gestiones y Seguimientos</h1>
          <p className="text-base-content/60">Programa visitas, llamadas, reuniones y seguimientos para cada agencia.</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => navigate("/crm/gestiones/nueva")}
        >
          <BiPlus className="h-5 w-5" />
          Nueva gestion
        </button>
      </div>

      <section className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <BiFilterAlt className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
          <input
            className="input input-bordered xl:col-span-2"
            placeholder="Buscar asunto, contacto o direccion"
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
          />
          <Select
            isSearchable
            options={allAgencyFilterOptions}
            value={allAgencyFilterOptions.find((option) => option.value === (filters.agency_id ? Number(filters.agency_id) : "")) ?? allAgencyFilterOptions[0]}
            onChange={(option) => setFilters((prev) => ({ ...prev, agency_id: option?.value ? String(option.value) : "" }))}
            isDisabled={!canSeeAllCrm}
            placeholder="Buscar agencia"
          />
          <Select
            isSearchable
            options={allManagerFilterOptions}
            value={allManagerFilterOptions.find((option) => option.value === (filters.assigned_user_id ? Number(filters.assigned_user_id) : "")) ?? allManagerFilterOptions[0]}
            onChange={(option) => setFilters((prev) => ({ ...prev, assigned_user_id: option?.value ? String(option.value) : "" }))}
            isDisabled={!canSeeAllCrm}
            placeholder="Buscar encargado"
          />
          <Select
            isSearchable
            options={allCityFilterOptions}
            value={allCityFilterOptions.find((option) => option.value === (filters.city_id ? Number(filters.city_id) : "")) ?? allCityFilterOptions[0]}
            onChange={(option) => setFilters((prev) => ({ ...prev, city_id: option?.value ? String(option.value) : "" }))}
            placeholder="Buscar ciudad"
          />
          <select
            className="select select-bordered"
            value={filters.status}
            onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
          >
            <option value="">Todos los estados</option>
            <option value="scheduled">Programada</option>
            <option value="pending">Pendiente</option>
            <option value="completed">Completada</option>
            <option value="rescheduled">Reprogramada</option>
            <option value="cancelled">Cancelada</option>
          </select>
          <select
            className="select select-bordered"
            value={filters.priority}
            onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
          >
            <option value="">Todas las prioridades</option>
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
          <input
            type="date"
            className="input input-bordered"
            value={filters.date_from}
            onChange={(e) => setFilters((prev) => ({ ...prev, date_from: e.target.value }))}
          />
          <input
            type="date"
            className="input input-bordered"
            value={filters.date_to}
            onChange={(e) => setFilters((prev) => ({ ...prev, date_to: e.target.value }))}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Listado de gestiones</h2>
            <p className="text-sm text-base-content/60">Visitas, llamadas y seguimientos programados por agencia.</p>
          </div>
          {isFetching && <span className="text-sm text-base-content/50">Actualizando...</span>}
        </div>

        {isLoading ? (
          <div className="py-16 text-center"><span className="loading loading-spinner loading-lg" /></div>
        ) : activities.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-base-300 p-10 text-center text-base-content/60">
            No hay gestiones con los filtros actuales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Asunto</th>
                  <th>Agencia</th>
                  <th>Ciudad</th>
                  <th>Tipo</th>
                  <th>Responsable</th>
                  <th>Programacion</th>
                  <th>Estado</th>
                  <th>Seguimiento</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr key={activity.id}>
                    <td>
                      <div className="font-semibold">{activity.subject}</div>
                      <div className="text-xs text-base-content/60">{activity.priority}</div>
                    </td>
                    <td>{activity.agency?.name ?? `Agencia #${activity.agency_id}`}</td>
                    <td className="hidden xl:table-cell">{cityMap.get(accessibleAgencies.find((agency) => agency.id === activity.agency_id)?.city_id ?? 0)?.name ?? "-"}</td>
                    <td>{activity.managementType?.name ?? "-"}</td>
                    <td>{activity.assignedUser?.name ?? "Sin asignar"}</td>
                    <td>{formatDateTime(activity.scheduled_start_at)}</td>
                    <td>
                      <span className={`badge ${statusClass[activity.status] ?? "badge-ghost"}`}>{activity.status}</span>
                    </td>
                    <td>{activity.follow_up_at ? formatDateTime(activity.follow_up_at) : "No"}</td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => navigate(`/crm/gestiones/${activity.id}/editar`)}
                        >
                          <BiPencil className="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          className="btn btn-outline btn-sm btn-error"
                          onClick={() => handleDelete(activity)}
                          disabled={deleteMutation.isPending}
                        >
                          <BiTrash className="h-4 w-4" />
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AgencyCrmTasksPage;
