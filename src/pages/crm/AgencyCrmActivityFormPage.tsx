import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import Select from "react-select";
import { BiBriefcase, BiBuilding, BiCalendar, BiCurrentLocation, BiEnvelope, BiMap, BiPhone, BiUser } from "react-icons/bi";
import { agencyCrmService } from "../../services/agencyCrmService";
import { agencyService } from "../../services/agencyService";
import { geoService } from "../../services/geoService";
import { userService } from "../../services/userService";
import type { Agency } from "../../types/agency";
import type { User } from "../../types/auth";
import type { AgencyCrmActivity, AgencyCrmActivityPayload } from "../../types/agencyCrm";
import type { City, Country, State } from "../../types/zone";
import { useAuthStore } from "../../stores/authStore";

const toDatetimeLocal = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const defaultForm: AgencyCrmActivityPayload = {
  agency_id: 0,
  management_type_id: 0,
  subject: "",
  scheduled_start_at: "",
  priority: "medium",
  status: "scheduled",
  requires_follow_up: false,
};

const autoResizeTextarea = (element: HTMLTextAreaElement | null) => {
  if (!element) return;
  element.style.height = "0px";
  element.style.height = `${element.scrollHeight}px`;
};

const AgencyCrmActivityFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canSeeAllCrm = hasPermission("agencies.list") || hasPermission("agency-crm.catalogs.list");
  const isEdit = Boolean(id);
  const [form, setForm] = useState<AgencyCrmActivityPayload>(defaultForm);
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const resultNotesRef = useRef<HTMLTextAreaElement | null>(null);
  const [locationFilters, setLocationFilters] = useState({
    country_id: "",
    state_id: "",
    city_id: "",
  });

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

  const { data: countries = [] } = useQuery<Country[]>({
    queryKey: ["agency-crm", "countries"],
    queryFn: () => geoService.getCountries(),
    refetchOnWindowFocus: false,
  });

  const { data: activity, isLoading: isLoadingActivity } = useQuery({
    queryKey: ["agency-crm", "activity", id],
    queryFn: () => agencyCrmService.getActivity(Number(id)),
    enabled: isEdit && Boolean(id),
    refetchOnWindowFocus: false,
  });

  const accessibleAgencies = useMemo(() => {
    if (canSeeAllCrm) return agencies;
    return agencies.filter((agency) => {
      if (user?.agency_id && agency.id === user.agency_id) return true;
      return agency.manager_user_id === user?.id;
    });
  }, [agencies, canSeeAllCrm, user?.agency_id, user?.id]);

  const countryIds = useMemo(
    () => Array.from(new Set(accessibleAgencies.map((agency) => agency.country_id).filter((v): v is number => Number.isFinite(v ?? NaN)))),
    [accessibleAgencies]
  );
  const filteredCountries = useMemo(() => countries.filter((country) => countryIds.includes(country.id)), [countries, countryIds]);

  const { data: states = [] } = useQuery<State[]>({
    queryKey: ["agency-crm", "form-states", locationFilters.country_id],
    queryFn: () => geoService.getStatesByCountry(Number(locationFilters.country_id)),
    enabled: Boolean(locationFilters.country_id),
    refetchOnWindowFocus: false,
  });

  const { data: cities = [] } = useQuery<City[]>({
    queryKey: ["agency-crm", "form-cities", locationFilters.country_id, locationFilters.state_id],
    queryFn: () =>
      locationFilters.state_id
        ? geoService.getCitiesByState(Number(locationFilters.state_id))
        : geoService.getCitiesByCountry(Number(locationFilters.country_id)),
    enabled: Boolean(locationFilters.country_id),
    refetchOnWindowFocus: false,
  });

  const { data: managementTypes = [] } = useQuery({
    queryKey: ["agency-crm", "management-types"],
    queryFn: () => agencyCrmService.getManagementTypes(),
    refetchOnWindowFocus: false,
  });

  const { data: resultTypes = [] } = useQuery({
    queryKey: ["agency-crm", "result-types"],
    queryFn: () => agencyCrmService.getResultTypes(),
    refetchOnWindowFocus: false,
  });

  const managerOptions = useMemo(() => {
    const source = canSeeAllCrm ? managers : managers.filter((manager) => manager.id === user?.id);
    return source.map((manager) => ({ value: manager.id, label: manager.name }));
  }, [canSeeAllCrm, managers, user?.id]);

  const filteredAgencies = useMemo(
    () =>
      accessibleAgencies.filter((agency) => {
        if (locationFilters.country_id && agency.country_id !== Number(locationFilters.country_id)) return false;
        if (locationFilters.state_id && agency.state_id !== Number(locationFilters.state_id)) return false;
        if (locationFilters.city_id && agency.city_id !== Number(locationFilters.city_id)) return false;
        return true;
      }),
    [accessibleAgencies, locationFilters.city_id, locationFilters.country_id, locationFilters.state_id]
  );

  const agencyOptions = useMemo(
    () => filteredAgencies.map((agency) => ({ value: agency.id, label: agency.name })),
    [filteredAgencies]
  );

  useEffect(() => {
    if (!canSeeAllCrm && user?.id && !isEdit) {
      const defaultAgencyId = user.agency_id ?? accessibleAgencies[0]?.id ?? 0;
      const defaultAgency = accessibleAgencies.find((agency) => agency.id === defaultAgencyId);
      setForm({
        ...defaultForm,
        agency_id: defaultAgencyId,
        assigned_user_id: user.id,
      });
      setLocationFilters({
        country_id: defaultAgency?.country_id ? String(defaultAgency.country_id) : "",
        state_id: defaultAgency?.state_id ? String(defaultAgency.state_id) : "",
        city_id: defaultAgency?.city_id ? String(defaultAgency.city_id) : "",
      });
    }
  }, [accessibleAgencies, canSeeAllCrm, isEdit, user?.agency_id, user?.id]);

  useEffect(() => {
    if (!activity) return;
    const agency = accessibleAgencies.find((item) => item.id === (activity.agency?.id ?? activity.agency_id));
    setForm({
      agency_id: activity.agency?.id ?? activity.agency_id,
      management_type_id: activity.managementType?.id ?? activity.management_type_id,
      result_type_id: activity.resultType?.id ?? activity.result_type_id ?? null,
      assigned_user_id: activity.assignedUser?.id ?? activity.assigned_user_id ?? null,
      parent_activity_id: activity.parent_activity_id ?? null,
      subject: activity.subject,
      description: activity.description ?? "",
      status: activity.status,
      priority: activity.priority,
      contact_name: activity.contact_name ?? "",
      contact_phone: activity.contact_phone ?? "",
      contact_email: activity.contact_email ?? "",
      location_name: activity.location_name ?? "",
      address: activity.address ?? "",
      scheduled_start_at: toDatetimeLocal(activity.scheduled_start_at),
      scheduled_end_at: toDatetimeLocal(activity.scheduled_end_at),
      completed_at: toDatetimeLocal(activity.completed_at),
      follow_up_at: toDatetimeLocal(activity.follow_up_at),
      requires_follow_up: Boolean(activity.requires_follow_up),
      result_notes: activity.result_notes ?? "",
    });
    setLocationFilters({
      country_id: agency?.country_id ? String(agency.country_id) : "",
      state_id: agency?.state_id ? String(agency.state_id) : "",
      city_id: agency?.city_id ? String(agency.city_id) : "",
    });
  }, [activity, accessibleAgencies]);

  useEffect(() => {
    autoResizeTextarea(descriptionRef.current);
  }, [form.description]);

  useEffect(() => {
    autoResizeTextarea(resultNotesRef.current);
  }, [form.result_notes]);

  const saveMutation = useMutation({
    mutationFn: (payload: AgencyCrmActivityPayload) =>
      isEdit && id ? agencyCrmService.updateActivity(Number(id), payload) : agencyCrmService.createActivity(payload),
    onSuccess: () => {
      toast.success(isEdit ? "Gestion actualizada correctamente" : "Gestion creada correctamente");
      queryClient.invalidateQueries({ queryKey: ["agency-crm", "activities"] });
      queryClient.invalidateQueries({ queryKey: ["agency-crm", "dashboard"] });
      navigate("/crm/gestiones");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "No se pudo guardar la gestion");
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.agency_id || !form.management_type_id || !form.subject || !form.scheduled_start_at) {
      toast.error("Completa agencia, tipo, asunto y fecha programada");
      return;
    }

    saveMutation.mutate({
      ...form,
      scheduled_start_at: new Date(form.scheduled_start_at).toISOString(),
      scheduled_end_at: form.scheduled_end_at ? new Date(form.scheduled_end_at).toISOString() : null,
      follow_up_at: form.follow_up_at ? new Date(form.follow_up_at).toISOString() : null,
      completed_at: form.completed_at ? new Date(form.completed_at).toISOString() : null,
    });
  };

  if (isEdit && isLoadingActivity) {
    return <div className="p-6 text-center"><span className="loading loading-spinner loading-lg" /></div>;
  }

  const selectedAgency = accessibleAgencies.find((agency) => agency.id === form.agency_id);
  const selectedCountry = filteredCountries.find((country) => country.id === Number(locationFilters.country_id));
  const selectedState = states.find((state) => state.id === Number(locationFilters.state_id));
  const selectedCity = cities.find((city) => city.id === Number(locationFilters.city_id));

  const applyAgencySelection = (agencyId: number) => {
    const agency = filteredAgencies.find((item) => item.id === agencyId) ?? accessibleAgencies.find((item) => item.id === agencyId);

    setForm((prev) => ({
      ...prev,
      agency_id: agencyId,
      contact_name: agency?.name ?? prev.contact_name ?? "",
      contact_phone: agency?.phone ?? prev.contact_phone ?? "",
      contact_email: agency?.email ?? prev.contact_email ?? "",
      address: agency?.address ?? prev.address ?? "",
      location_name: agency?.name ?? prev.location_name ?? "",
    }));

    if (agency) {
      setLocationFilters({
        country_id: agency.country_id ? String(agency.country_id) : "",
        state_id: agency.state_id ? String(agency.state_id) : "",
        city_id: agency.city_id ? String(agency.city_id) : "",
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-base-content">{isEdit ? "Editar gestion" : "Nueva gestion"}</h1>
          <p className="text-base-content/60">Programa y edita seguimientos de agencias en una vista limpia.</p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate("/crm/gestiones")}>
          Volver al listado
        </button>
      </div>

      <form className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm" onSubmit={handleSubmit}>
        <div className="space-y-6">
          <section className="rounded-2xl border border-base-200 bg-base-100/60 p-4">
            <div className="mb-4 flex items-center gap-2">
              <BiMap className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">Ubicacion y Agencia</h2>
                <p className="text-sm text-base-content/60">Filtra por pais, estado y ciudad antes de elegir la agencia.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="form-control">
                <span className="label-text mb-1">Pais</span>
                <select className="select select-bordered" value={locationFilters.country_id} onChange={(e) => {
                  setLocationFilters({ country_id: e.target.value, state_id: "", city_id: "" });
                  setForm((prev) => ({ ...prev, agency_id: 0 }));
                }}>
                  <option value="">Todos</option>
                  {filteredCountries.map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
                </select>
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Estado</span>
                <select className="select select-bordered" value={locationFilters.state_id} disabled={!locationFilters.country_id} onChange={(e) => {
                  setLocationFilters((prev) => ({ ...prev, state_id: e.target.value, city_id: "" }));
                  setForm((prev) => ({ ...prev, agency_id: 0 }));
                }}>
                  <option value="">Todos</option>
                  {states.filter((state) => accessibleAgencies.some((agency) => agency.state_id === state.id)).map((state) => (
                    <option key={state.id} value={state.id}>{state.name}</option>
                  ))}
                </select>
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Ciudad</span>
                <select className="select select-bordered" value={locationFilters.city_id} disabled={!locationFilters.country_id} onChange={(e) => {
                  setLocationFilters((prev) => ({ ...prev, city_id: e.target.value }));
                  setForm((prev) => ({ ...prev, agency_id: 0 }));
                }}>
                  <option value="">Todas</option>
                  {cities.filter((city) => accessibleAgencies.some((agency) => agency.city_id === city.id)).map((city) => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Agencia</span>
                <Select
                  isSearchable
                  options={agencyOptions}
                  value={agencyOptions.find((option) => option.value === form.agency_id) ?? null}
                  onChange={(option) => applyAgencySelection(option?.value ?? 0)}
                  isDisabled={!canSeeAllCrm}
                  placeholder="Escribe para buscar agencia"
                />
              </label>
            </div>

            {selectedAgency && (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl bg-base-200/60 p-3">
                  <div className="text-xs uppercase tracking-wide text-base-content/50">Agencia</div>
                  <div className="mt-1 font-semibold">{selectedAgency.name}</div>
                </div>
                <div className="rounded-xl bg-base-200/60 p-3">
                  <div className="text-xs uppercase tracking-wide text-base-content/50">Ubicacion</div>
                  <div className="mt-1 font-semibold">{[selectedCountry?.name, selectedState?.name, selectedCity?.name].filter(Boolean).join(" / ") || "Sin ubicacion"}</div>
                </div>
                <div className="rounded-xl bg-base-200/60 p-3">
                  <div className="text-xs uppercase tracking-wide text-base-content/50">Telefono</div>
                  <div className="mt-1 font-semibold">{selectedAgency.phone || "Sin telefono"}</div>
                </div>
                <div className="rounded-xl bg-base-200/60 p-3">
                  <div className="text-xs uppercase tracking-wide text-base-content/50">Correo</div>
                  <div className="mt-1 font-semibold break-all">{selectedAgency.email || "Sin correo"}</div>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-base-200 bg-base-100/60 p-4">
            <div className="mb-4 flex items-center gap-2">
              <BiBriefcase className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">Gestion Comercial</h2>
                <p className="text-sm text-base-content/60">Define el tipo, responsable, prioridad y enfoque de la gestion.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="form-control">
                <span className="label-text mb-1">Tipo de gestion</span>
                <select className="select select-bordered" value={form.management_type_id || ""} onChange={(e) => setForm((prev) => ({ ...prev, management_type_id: Number(e.target.value) }))}>
                  <option value="">Selecciona</option>
                  {managementTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                </select>
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Responsable</span>
                <Select
                  isSearchable
                  options={managerOptions}
                  value={managerOptions.find((option) => option.value === form.assigned_user_id) ?? null}
                  onChange={(option) => setForm((prev) => ({ ...prev, assigned_user_id: option?.value ?? null }))}
                  isDisabled={!canSeeAllCrm}
                  placeholder="Escribe para buscar encargado"
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Prioridad</span>
                <select className="select select-bordered" value={form.priority || "medium"} onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value as AgencyCrmActivity["priority"] }))}>
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Estado</span>
                <select className="select select-bordered" value={form.status || "scheduled"} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as AgencyCrmActivity["status"] }))}>
                  <option value="scheduled">Programada</option>
                  <option value="pending">Pendiente</option>
                  <option value="completed">Completada</option>
                  <option value="rescheduled">Reprogramada</option>
                  <option value="cancelled">Cancelada</option>
                </select>
              </label>

              <label className="form-control md:col-span-2 xl:col-span-4">
                <span className="label-text mb-1">Asunto</span>
                <div className="rounded-2xl border border-base-300 bg-base-100 p-3 shadow-sm">
                  <input
                    className="input input-bordered w-full text-base font-medium"
                    value={form.subject}
                    onChange={(e) => setForm((prev) => ({ ...prev, subject: e.target.value }))}
                    placeholder="Ej. Visita comercial mensual a la agencia para revisar ventas, convenios y oportunidades"
                  />
                  <p className="mt-2 text-xs text-base-content/60">
                    Usa un asunto claro y accionable. Este texto será lo primero que veas en el listado y el calendario.
                  </p>
                </div>
              </label>

              <label className="form-control md:col-span-2 xl:col-span-4">
                <span className="label-text mb-1">Descripcion</span>
                <textarea
                  ref={descriptionRef}
                  rows={4}
                  className="textarea textarea-bordered min-h-28 w-full resize-none overflow-hidden"
                  value={form.description || ""}
                  onInput={(e) => autoResizeTextarea(e.currentTarget)}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Objetivo de la visita, temas a tratar, observaciones previas..."
                />
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-base-200 bg-base-100/60 p-4">
            <div className="mb-4 flex items-center gap-2">
              <BiUser className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">Contacto y Lugar</h2>
                <p className="text-sm text-base-content/60">Estos datos se completan automaticamente al elegir la agencia, pero puedes ajustarlos.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="form-control">
                <span className="label-text mb-1">Contacto</span>
                <input className="input input-bordered" value={form.contact_name || ""} onChange={(e) => setForm((prev) => ({ ...prev, contact_name: e.target.value }))} />
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Telefono</span>
                <div className="relative">
                  <BiPhone className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                  <input className="input input-bordered w-full pl-10" value={form.contact_phone || ""} onChange={(e) => setForm((prev) => ({ ...prev, contact_phone: e.target.value }))} />
                </div>
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Correo</span>
                <div className="relative">
                  <BiEnvelope className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                  <input className="input input-bordered w-full pl-10" value={form.contact_email || ""} onChange={(e) => setForm((prev) => ({ ...prev, contact_email: e.target.value }))} />
                </div>
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Lugar</span>
                <div className="relative">
                  <BiBuilding className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" />
                  <input className="input input-bordered w-full pl-10" value={form.location_name || ""} onChange={(e) => setForm((prev) => ({ ...prev, location_name: e.target.value }))} />
                </div>
              </label>

              <label className="form-control xl:col-span-4">
                <span className="label-text mb-1">Direccion</span>
                <div className="relative">
                  <BiCurrentLocation className="pointer-events-none absolute left-3 top-3 text-base-content/50" />
                  <input className="input input-bordered w-full pl-10" value={form.address || ""} onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))} />
                </div>
              </label>
            </div>
          </section>

          <section className="rounded-2xl border border-base-200 bg-base-100/60 p-4">
            <div className="mb-4 flex items-center gap-2">
              <BiCalendar className="h-5 w-5 text-primary" />
              <div>
                <h2 className="font-semibold">Programacion y Seguimiento</h2>
                <p className="text-sm text-base-content/60">Define fecha, resultado y proximos pasos de la gestion.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="form-control">
                <span className="label-text mb-1">Inicio programado</span>
                <input type="datetime-local" className="input input-bordered" value={toDatetimeLocal(form.scheduled_start_at)} onChange={(e) => setForm((prev) => ({ ...prev, scheduled_start_at: e.target.value }))} />
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Fin programado</span>
                <input type="datetime-local" className="input input-bordered" value={toDatetimeLocal(form.scheduled_end_at)} onChange={(e) => setForm((prev) => ({ ...prev, scheduled_end_at: e.target.value || null }))} />
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Resultado</span>
                <select className="select select-bordered" value={form.result_type_id || ""} onChange={(e) => setForm((prev) => ({ ...prev, result_type_id: e.target.value ? Number(e.target.value) : null }))}>
                  <option value="">Sin definir</option>
                  {resultTypes.map((result) => <option key={result.id} value={result.id}>{result.name}</option>)}
                </select>
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Fecha de seguimiento</span>
                <input type="datetime-local" className="input input-bordered" value={toDatetimeLocal(form.follow_up_at)} onChange={(e) => setForm((prev) => ({ ...prev, follow_up_at: e.target.value || null }))} />
              </label>

              <div className="md:col-span-2 xl:col-span-4 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="form-control">
                    <span className="label-text mb-1">Resultado</span>
                    <select className="select select-bordered" value={form.result_type_id || ""} onChange={(e) => setForm((prev) => ({ ...prev, result_type_id: e.target.value ? Number(e.target.value) : null }))}>
                      <option value="">Sin definir</option>
                      {resultTypes.map((result) => <option key={result.id} value={result.id}>{result.name}</option>)}
                    </select>
                  </label>

                  <label className="form-control xl:col-span-2">
                    <span className="label-text mb-1">Descripcion del resultado</span>
                    <textarea
                      ref={resultNotesRef}
                      rows={4}
                      className="textarea textarea-bordered min-h-28 w-full resize-none overflow-hidden"
                      value={form.result_notes || ""}
                      onInput={(e) => autoResizeTextarea(e.currentTarget)}
                      onChange={(e) => setForm((prev) => ({ ...prev, result_notes: e.target.value }))}
                      placeholder="Ej. La agencia confirmó interés, se revisó portafolio, quedó pendiente enviar propuesta y programar nueva visita."
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>

        <label className="mt-4 inline-flex items-center gap-2">
          <input type="checkbox" className="checkbox checkbox-primary" checked={Boolean(form.requires_follow_up)} onChange={(e) => setForm((prev) => ({ ...prev, requires_follow_up: e.target.checked }))} />
          <span className="text-sm text-base-content/70">Requiere seguimiento posterior</span>
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-outline" onClick={() => navigate("/crm/gestiones")}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Guardando..." : isEdit ? "Actualizar gestion" : "Guardar gestion"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AgencyCrmActivityFormPage;
