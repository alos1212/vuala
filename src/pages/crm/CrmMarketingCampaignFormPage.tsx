import React, { useEffect, useState } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BiArrowBack, BiSave } from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { companyService } from '../../services/companyService';
import { clientService } from '../../services/clientService';
import { crmService } from '../../services/crmService';
import { geoService } from '../../services/geoService';
import { roleService } from '../../services/roleService';
import { useAuthStore } from '../../stores/authStore';
import type { CrmEmailCampaignPayload } from '../../types/crm';
import { combineDateAndTime, getEmptyCampaignForm, toDateTimeParts } from './marketingShared';

const CrmMarketingCampaignFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isGlobalUser = !user?.company_id;
  const userCompanyId = Number(user?.company_id ?? user?.company?.id) || null;
  const companyIdFromQuery = searchParams.get('company_id');
  const campaignId = id ? Number(id) : null;
  const isEditing = Boolean(campaignId);

  const [campaignForm, setCampaignForm] = useState<CrmEmailCampaignPayload>(
    getEmptyCampaignForm(userCompanyId ?? (companyIdFromQuery ? Number(companyIdFromQuery) : null))
  );
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState('09:00');
  const [isSaving, setIsSaving] = useState(false);

  const { data: campaignData } = useQuery({
    queryKey: ['crm-marketing-campaign', campaignId],
    queryFn: () => crmService.getMarketingCampaign(campaignId as number),
    enabled: Boolean(campaignId),
  });

  useEffect(() => {
    if (!campaignData) return;

    const campaign = campaignData;
    const { date, time } = toDateTimeParts(campaign.scheduled_at);
    setScheduledDate(date);
    setScheduledTime(time || '09:00');
    setCampaignForm({
      company_id: campaign.company_id,
      template_id: campaign.template_id,
      name: campaign.name,
      status: campaign.status === 'scheduled' ? 'scheduled' : 'draft',
      audience_source: campaign.audience_source,
      audience_filters: {
        client_id: campaign.audience_filters?.client_id ?? null,
        country_id: campaign.audience_filters?.country_id ?? null,
        state_id: campaign.audience_filters?.state_id ?? null,
        city_id: campaign.audience_filters?.city_id ?? null,
        role_id: campaign.audience_filters?.role_id ?? null,
        only_active: campaign.audience_filters?.only_active ?? true,
        only_primary: campaign.audience_filters?.only_primary ?? false,
      },
      reply_to_email: campaign.reply_to_email ?? '',
      reply_to_name: campaign.reply_to_name ?? '',
      subject_override: campaign.subject_override ?? '',
      preheader_override: campaign.preheader_override ?? '',
      body_html_override: campaign.body_html_override ?? '',
      body_text_override: campaign.body_text_override ?? '',
      scheduled_at: campaign.scheduled_at ? campaign.scheduled_at.slice(0, 16) : '',
    });
  }, [campaignData]);

  const companyId = isGlobalUser ? (campaignForm.company_id ? Number(campaignForm.company_id) : null) : userCompanyId;

  const { data: companiesData } = useQuery({
    queryKey: ['crm-marketing-companies'],
    queryFn: () => companyService.getCompanies({ per_page: 200 }),
    enabled: isGlobalUser,
  });

  const { data: templatesData } = useQuery({
    queryKey: ['crm-marketing-templates', companyId],
    queryFn: () => crmService.getMarketingTemplates(companyId ? { company_id: companyId, per_page: 100 } : { per_page: 100 }),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['crm-marketing-roles'],
    queryFn: () => roleService.getAvailableRoles(),
    enabled: campaignForm.audience_source === 'users',
  });

  const { data: clientsData } = useQuery({
    queryKey: ['crm-marketing-clients', companyId],
    queryFn: () => clientService.getClients({ company_id: companyId ?? undefined, per_page: 200 }),
    enabled: Boolean(companyId),
  });

  const { data: audiencePreviewData, isLoading: isLoadingAudiencePreview } = useQuery({
    queryKey: ['crm-marketing-audience-preview', companyId, campaignForm.audience_source, campaignForm.audience_filters],
    queryFn: () => crmService.getContacts({
      company_id: companyId ?? undefined,
      client_id: campaignForm.audience_filters?.client_id ?? undefined,
      country_id: campaignForm.audience_filters?.country_id ?? undefined,
      state_id: campaignForm.audience_filters?.state_id ?? undefined,
      city_id: campaignForm.audience_filters?.city_id ?? undefined,
      is_active: campaignForm.audience_filters?.only_active ?? undefined,
      is_primary: campaignForm.audience_filters?.only_primary ?? undefined,
      per_page: 200,
    }),
    enabled: campaignForm.audience_source === 'crm_contacts' && Boolean(companyId),
  });

  const { data: countries } = useQuery({
    queryKey: ['crm-marketing-countries'],
    queryFn: () => geoService.getCountries(),
  });

  const selectedCountryId = Number(campaignForm.audience_filters?.country_id) || undefined;
  const selectedStateId = Number(campaignForm.audience_filters?.state_id) || undefined;

  const { data: states } = useQuery({
    queryKey: ['crm-marketing-states', selectedCountryId],
    queryFn: () => geoService.getStatesByCountry(selectedCountryId as number),
    enabled: Boolean(selectedCountryId),
  });

  const { data: cities } = useQuery({
    queryKey: ['crm-marketing-cities', selectedStateId],
    queryFn: () => geoService.getCitiesByState(selectedStateId as number),
    enabled: Boolean(selectedStateId),
  });

  const companies = companiesData?.data ?? [];
  const templates = templatesData?.data ?? [];
  const clients = clientsData?.data ?? [];
  const audiencePreviewContacts = (audiencePreviewData?.data ?? []).filter((contact) => Boolean(contact.email));
  const companyOptions = companies.map((company) => ({ value: company.id, label: company.name }));
  const templateOptions = templates.map((template) => ({ value: template.id, label: template.name }));
  const clientOptions = clients.map((client) => ({ value: client.id, label: client.name }));
  const roleOptions = (rolesData ?? []).filter((role) => role.type === 1 || role.type === 0).map((role) => ({ value: role.id, label: role.display_name }));

  const handleSave = async () => {
    if (!campaignForm.name.trim() || !campaignForm.template_id) {
      toast.error('Completa nombre y plantilla de la campaña');
      return;
    }

    if (!companyId) {
      toast.error('Selecciona una compañía para la campaña');
      return;
    }

    const scheduledAt = campaignForm.status === 'scheduled' ? combineDateAndTime(scheduledDate, scheduledTime) : '';
    if (campaignForm.status === 'scheduled' && !scheduledAt) {
      toast.error('Selecciona fecha y hora para programar la campaña');
      return;
    }

    setIsSaving(true);
    try {
      const payload: CrmEmailCampaignPayload = {
        ...campaignForm,
        company_id: companyId,
        scheduled_at: scheduledAt || null,
        audience_filters: {
          ...campaignForm.audience_filters,
          client_id: campaignForm.audience_filters?.client_id || null,
          country_id: campaignForm.audience_filters?.country_id || null,
          state_id: campaignForm.audience_filters?.state_id || null,
          city_id: campaignForm.audience_filters?.city_id || null,
          role_id: campaignForm.audience_filters?.role_id || null,
        },
      };

      if (isEditing) {
        await crmService.updateMarketingCampaign(campaignId as number, payload);
        toast.success('Campaña actualizada correctamente');
      } else {
        await crmService.createMarketingCampaign(payload);
        toast.success('Campaña creada correctamente');
      }

      await queryClient.invalidateQueries({ queryKey: ['crm-marketing-campaigns'] });
      navigate(`/crm/marketing?tab=campaigns${companyId ? `&company_id=${companyId}` : ''}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No se pudo guardar la campaña');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm mb-3"
            onClick={() => navigate(`/crm/marketing?tab=campaigns${companyId ? `&company_id=${companyId}` : ''}`)}
          >
            <BiArrowBack className="h-4 w-4" />
            Volver a marketing
          </button>
          <h1 className="text-3xl font-bold">{isEditing ? 'Editar campaña' : 'Nueva campaña'}</h1>
          <p className="text-base-content/60">Configura la campaña en una página propia con selector visual de fecha.</p>
        </div>
        <button type="button" className="btn btn-primary" disabled={isSaving} onClick={handleSave}>
          <BiSave className="h-4 w-4" />
          {isSaving ? 'Guardando...' : isEditing ? 'Actualizar campaña' : 'Crear campaña'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <section className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {isGlobalUser && (
              <div>
                <label className="mb-2 block text-sm font-medium">Compañía</label>
                <SearchableSelect
                  options={companyOptions}
                  value={campaignForm.company_id ?? null}
                  onChange={(value) => setCampaignForm((current) => ({
                    ...current,
                    company_id: value ? Number(value) : null,
                    audience_filters: {
                      ...current.audience_filters,
                      client_id: null,
                    },
                  }))}
                  placeholder="Selecciona compañía"
                />
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium">Nombre</label>
              <input className="input input-bordered w-full" value={campaignForm.name} onChange={(event) => setCampaignForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Plantilla</label>
              <SearchableSelect
                options={templateOptions}
                value={campaignForm.template_id || null}
                onChange={(value) => setCampaignForm((current) => ({ ...current, template_id: value ? Number(value) : 0 }))}
                placeholder="Selecciona plantilla"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Modo</label>
              <select className="select select-bordered w-full" value={campaignForm.status ?? 'draft'} onChange={(event) => setCampaignForm((current) => ({ ...current, status: event.target.value as 'draft' | 'scheduled' }))}>
                <option value="draft">Borrador</option>
                <option value="scheduled">Programada</option>
              </select>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow">
          <h2 className="mb-4 text-lg font-semibold">Programación</h2>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
            <div className="rounded-3xl border border-base-200 bg-base-50 p-4">
              <DayPicker
                mode="single"
                selected={scheduledDate}
                onSelect={(value) => {
                  setScheduledDate(value);
                  setCampaignForm((current) => ({ ...current, scheduled_at: combineDateAndTime(value, scheduledTime) }));
                }}
                disabled={{ before: new Date() }}
              />
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">Hora de envío</label>
                <input
                  type="time"
                  className="input input-bordered w-full max-w-xs"
                  value={scheduledTime}
                  onChange={(event) => {
                    setScheduledTime(event.target.value);
                    setCampaignForm((current) => ({ ...current, scheduled_at: combineDateAndTime(scheduledDate, event.target.value) }));
                  }}
                />
              </div>
              <div className="rounded-2xl border border-dashed border-base-300 p-4 text-sm text-base-content/70">
                {campaignForm.status === 'scheduled'
                  ? 'Selecciona una fecha y hora para dejar la campaña programada.'
                  : 'Si la campaña está en borrador, la fecha se guarda solo como referencia hasta que la programes.'}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow">
          <h2 className="mb-4 text-lg font-semibold">Audiencia</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Audiencia</label>
              <select className="select select-bordered w-full" value={campaignForm.audience_source} onChange={(event) => setCampaignForm((current) => ({
                ...current,
                audience_source: event.target.value as 'crm_contacts' | 'users',
                audience_filters: {
                  only_active: current.audience_filters?.only_active ?? true,
                  only_primary: false,
                  client_id: null,
                  country_id: null,
                  state_id: null,
                  city_id: null,
                  role_id: null,
                },
              }))}>
                <option value="crm_contacts">Contactos CRM</option>
                <option value="users">Usuarios internos</option>
              </select>
            </div>
            <label className="flex items-center gap-2 rounded-2xl border border-base-200 px-3 py-2">
              <input type="checkbox" className="checkbox checkbox-sm" checked={campaignForm.audience_filters?.only_active ?? true} onChange={(event) => setCampaignForm((current) => ({
                ...current,
                audience_filters: {
                  ...current.audience_filters,
                  only_active: event.target.checked,
                },
              }))} />
              <span className="text-sm">Solo destinatarios activos</span>
            </label>
            {campaignForm.audience_source === 'crm_contacts' ? (
              <>
                <div>
                  <label className="mb-2 block text-sm font-medium">Cliente</label>
                  <SearchableSelect
                    options={clientOptions}
                    value={campaignForm.audience_filters?.client_id ?? null}
                    onChange={(value) => setCampaignForm((current) => ({
                      ...current,
                      audience_filters: {
                        ...current.audience_filters,
                        client_id: value ? Number(value) : null,
                      },
                    }))}
                    placeholder="Todos los clientes"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium">País</label>
                    <select className="select select-bordered w-full" value={campaignForm.audience_filters?.country_id ?? ''} onChange={(event) => setCampaignForm((current) => ({
                      ...current,
                      audience_filters: {
                        ...current.audience_filters,
                        country_id: event.target.value ? Number(event.target.value) : null,
                        state_id: null,
                        city_id: null,
                      },
                    }))}>
                      <option value="">Todos</option>
                      {(countries ?? []).map((country) => <option key={country.id} value={country.id}>{country.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Estado</label>
                    <select className="select select-bordered w-full" value={campaignForm.audience_filters?.state_id ?? ''} onChange={(event) => setCampaignForm((current) => ({
                      ...current,
                      audience_filters: {
                        ...current.audience_filters,
                        state_id: event.target.value ? Number(event.target.value) : null,
                        city_id: null,
                      },
                    }))} disabled={!selectedCountryId}>
                      <option value="">Todos</option>
                      {(states ?? []).map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium">Ciudad</label>
                    <select className="select select-bordered w-full" value={campaignForm.audience_filters?.city_id ?? ''} onChange={(event) => setCampaignForm((current) => ({
                      ...current,
                      audience_filters: {
                        ...current.audience_filters,
                        city_id: event.target.value ? Number(event.target.value) : null,
                      },
                    }))} disabled={!selectedStateId}>
                      <option value="">Todas</option>
                      {(cities ?? []).map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 rounded-2xl border border-base-200 px-3 py-2">
                  <input type="checkbox" className="checkbox checkbox-sm" checked={campaignForm.audience_filters?.only_primary ?? false} onChange={(event) => setCampaignForm((current) => ({
                    ...current,
                    audience_filters: {
                      ...current.audience_filters,
                      only_primary: event.target.checked,
                    },
                  }))} />
                  <span className="text-sm">Solo contactos principales</span>
                </label>
              </>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-medium">Filtrar por rol</label>
                <SearchableSelect
                  options={roleOptions}
                  value={campaignForm.audience_filters?.role_id ?? null}
                  onChange={(value) => setCampaignForm((current) => ({
                    ...current,
                    audience_filters: {
                      ...current.audience_filters,
                      role_id: value ? Number(value) : null,
                    },
                  }))}
                  placeholder="Todos los roles"
                />
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Vista previa de destinatarios</h2>
            {campaignForm.audience_source === 'crm_contacts' && audiencePreviewData?.meta?.total ? (
              <span className="text-sm text-base-content/60">
                {audiencePreviewContacts.length} correos visibles de {audiencePreviewData.meta.total} contactos filtrados
              </span>
            ) : null}
          </div>

          {campaignForm.audience_source !== 'crm_contacts' ? (
            <div className="rounded-2xl border border-dashed border-base-300 p-6 text-sm text-base-content/60">
              La vista previa de correos está disponible cuando la audiencia es `Contactos CRM`.
            </div>
          ) : isLoadingAudiencePreview ? (
            <div className="py-10 text-center"><span className="loading loading-spinner loading-md" /></div>
          ) : audiencePreviewContacts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-base-300 p-6 text-sm text-base-content/60">
              No hay contactos con correo que cumplan los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Correo</th>
                    <th>Cliente</th>
                    <th>Compañía</th>
                  </tr>
                </thead>
                <tbody>
                  {audiencePreviewContacts.map((contact) => (
                    <tr key={contact.id}>
                      <td>{contact.name}</td>
                      <td>{contact.email}</td>
                      <td>{contact.client?.name || '-'}</td>
                      <td>{contact.company?.name || `Compañía #${contact.company_id}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow">
          <h2 className="mb-4 text-lg font-semibold">Configuración de envío</h2>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">Reply-to name</label>
              <input className="input input-bordered w-full" value={campaignForm.reply_to_name ?? ''} onChange={(event) => setCampaignForm((current) => ({ ...current, reply_to_name: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Reply-to email</label>
              <input className="input input-bordered w-full" value={campaignForm.reply_to_email ?? ''} onChange={(event) => setCampaignForm((current) => ({ ...current, reply_to_email: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Asunto personalizado</label>
              <input className="input input-bordered w-full" value={campaignForm.subject_override ?? ''} onChange={(event) => setCampaignForm((current) => ({ ...current, subject_override: event.target.value }))} placeholder="Opcional; si lo dejas vacío usa el asunto de la plantilla." />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Preheader personalizado</label>
              <input className="input input-bordered w-full" value={campaignForm.preheader_override ?? ''} onChange={(event) => setCampaignForm((current) => ({ ...current, preheader_override: event.target.value }))} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CrmMarketingCampaignFormPage;
