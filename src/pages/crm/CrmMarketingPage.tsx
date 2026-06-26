import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BiEnvelope, BiPlay, BiStop, BiTrash, BiPencil, BiPlus, BiShow } from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { companyService } from '../../services/companyService';
import { crmService } from '../../services/crmService';
import { useAuthStore } from '../../stores/authStore';
import type { CrmEmailCampaign, CrmEmailTemplate } from '../../types/crm';
import { badgeClassByStatus, campaignStatusLabel } from './marketingShared';

type TabKey = 'templates' | 'campaigns';

const CrmMarketingPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const [searchParams, setSearchParams] = useSearchParams();

  const isGlobalUser = !user?.company_id;
  const userCompanyId = Number(user?.company_id ?? user?.company?.id) || null;
  const initialTab = searchParams.get('tab') === 'templates' ? 'templates' : 'campaigns';
  const initialCompanyId = searchParams.get('company_id');

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(
    userCompanyId ?? (initialCompanyId ? Number(initialCompanyId) : null)
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [submittingCampaignAction, setSubmittingCampaignAction] = useState<number | null>(null);

  useEffect(() => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set('tab', activeTab);
      if (selectedCompanyId) {
        next.set('company_id', String(selectedCompanyId));
      } else {
        next.delete('company_id');
      }
      return next;
    }, { replace: true });
  }, [activeTab, selectedCompanyId, setSearchParams]);

  const scopedCompanyId = isGlobalUser ? selectedCompanyId : userCompanyId;
  const canDeleteTemplates = hasPermission('crm.marketing.templates.delete');
  const canManageCampaigns = hasPermission('crm.marketing.campaigns.create') || hasPermission('crm.marketing.campaigns.update');
  const canDeleteCampaigns = hasPermission('crm.marketing.campaigns.delete');
  const canSendCampaigns = hasPermission('crm.marketing.campaigns.send');

  const { data: companiesData } = useQuery({
    queryKey: ['crm-marketing-companies'],
    queryFn: () => companyService.getCompanies({ per_page: 200 }),
    enabled: isGlobalUser,
  });

  const { data: templatesData, isLoading: isLoadingTemplates } = useQuery({
    queryKey: ['crm-marketing-templates', scopedCompanyId],
    queryFn: () => crmService.getMarketingTemplates(scopedCompanyId ? { company_id: scopedCompanyId, per_page: 100 } : { per_page: 100 }),
  });

  const { data: campaignsData, isLoading: isLoadingCampaigns } = useQuery({
    queryKey: ['crm-marketing-campaigns', scopedCompanyId],
    queryFn: () => crmService.getMarketingCampaigns(scopedCompanyId ? { company_id: scopedCompanyId, per_page: 100 } : { per_page: 100 }),
    refetchInterval: (query) => {
      const campaignList = query.state.data?.data ?? [];
      const campaign = campaignList.find((entry: CrmEmailCampaign) => entry.id === selectedCampaignId);
      return campaign && (campaign.status === 'processing' || campaign.status === 'scheduled') ? 5000 : false;
    },
  });

  const companies = companiesData?.data ?? [];
  const templates = templatesData?.data ?? [];
  const campaigns = campaignsData?.data ?? [];
  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null;

  const { data: recipientsData, isLoading: isLoadingRecipients } = useQuery({
    queryKey: ['crm-marketing-campaign-recipients', selectedCampaignId],
    queryFn: () => crmService.getMarketingCampaignRecipients(selectedCampaignId as number, { per_page: 50 }),
    enabled: Boolean(selectedCampaignId),
    refetchInterval: () => (selectedCampaignId ? 5000 : false),
  });

  const { data: selectedCampaignAudiencePreview, isLoading: isLoadingSelectedCampaignAudiencePreview } = useQuery({
    queryKey: ['crm-marketing-selected-campaign-audience', selectedCampaignId, selectedCampaign?.company_id, selectedCampaign?.audience_filters],
    queryFn: () => crmService.getContacts({
      company_id: selectedCampaign?.company_id,
      client_id: selectedCampaign?.audience_filters?.client_id ?? undefined,
      country_id: selectedCampaign?.audience_filters?.country_id ?? undefined,
      state_id: selectedCampaign?.audience_filters?.state_id ?? undefined,
      city_id: selectedCampaign?.audience_filters?.city_id ?? undefined,
      is_active: selectedCampaign?.audience_filters?.only_active ?? undefined,
      is_primary: selectedCampaign?.audience_filters?.only_primary ?? undefined,
      per_page: 200,
    }),
    enabled: Boolean(selectedCampaign) && selectedCampaign?.audience_source === 'crm_contacts',
    refetchInterval: () => (selectedCampaignId ? 5000 : false),
  });
  const recipients = recipientsData?.data ?? [];
  const selectedCampaignAudienceContacts = (selectedCampaignAudiencePreview?.data ?? []).filter((contact) => Boolean(contact.email));
  const companyOptions = companies.map((company) => ({ value: company.id, label: company.name }));

  const campaignStats = useMemo(() => {
    return campaigns.reduce(
      (accumulator, campaign) => {
        accumulator.total += 1;
        accumulator.sent += campaign.sent_count ?? 0;
        accumulator.pending += campaign.pending_count ?? 0;
        accumulator.failed += campaign.failed_count ?? 0;
        return accumulator;
      },
      { total: 0, sent: 0, pending: 0, failed: 0 }
    );
  }, [campaigns]);

  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? null;

  const handleTemplateDelete = async (template: CrmEmailTemplate) => {
    if (!window.confirm(`¿Eliminar la plantilla "${template.name}"?`)) return;

    try {
      await crmService.deleteMarketingTemplate(template.id);
      await queryClient.invalidateQueries({ queryKey: ['crm-marketing-templates'] });
      if (selectedTemplateId === template.id) setSelectedTemplateId(null);
      toast.success('Plantilla eliminada correctamente');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No se pudo eliminar la plantilla');
    }
  };

  const handleCampaignDelete = async (campaign: CrmEmailCampaign) => {
    if (!window.confirm(`¿Eliminar la campaña "${campaign.name}"?`)) return;

    try {
      await crmService.deleteMarketingCampaign(campaign.id);
      await queryClient.invalidateQueries({ queryKey: ['crm-marketing-campaigns'] });
      if (selectedCampaignId === campaign.id) setSelectedCampaignId(null);
      toast.success('Campaña eliminada correctamente');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No se pudo eliminar la campaña');
    }
  };

  const handleLaunchCampaign = async (campaign: CrmEmailCampaign) => {
    try {
      setSubmittingCampaignAction(campaign.id);
      setSelectedCampaignId(campaign.id);
      await crmService.launchMarketingCampaign(campaign.id);
      await queryClient.invalidateQueries({ queryKey: ['crm-marketing-campaigns'] });
      await queryClient.invalidateQueries({ queryKey: ['crm-marketing-campaign-recipients', campaign.id] });
      toast.success('Campaña puesta en cola correctamente');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No se pudo lanzar la campaña');
    } finally {
      setSubmittingCampaignAction(null);
    }
  };

  const handleSendCampaignNow = async (campaign: CrmEmailCampaign) => {
    try {
      setSubmittingCampaignAction(campaign.id);
      setSelectedCampaignId(campaign.id);
      await crmService.sendMarketingCampaignNow(campaign.id);
      await queryClient.invalidateQueries({ queryKey: ['crm-marketing-campaigns'] });
      await queryClient.invalidateQueries({ queryKey: ['crm-marketing-campaign-recipients', campaign.id] });
      toast.success('Campaña enviada de inmediato');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No se pudo enviar la campaña de inmediato');
    } finally {
      setSubmittingCampaignAction(null);
    }
  };

  const handleCancelCampaign = async (campaign: CrmEmailCampaign) => {
    try {
      setSubmittingCampaignAction(campaign.id);
      await crmService.cancelMarketingCampaign(campaign.id);
      await queryClient.invalidateQueries({ queryKey: ['crm-marketing-campaigns'] });
      await queryClient.invalidateQueries({ queryKey: ['crm-marketing-campaign-recipients', campaign.id] });
      toast.success('Campaña cancelada correctamente');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No se pudo cancelar la campaña');
    } finally {
      setSubmittingCampaignAction(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                <BiEnvelope className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Marketing CRM</h1>
                <p className="text-base-content/60">Administra campañas y plantillas desde listados limpios, con formularios en páginas independientes.</p>
              </div>
            </div>
          </div>
          {isGlobalUser && (
            <div className="w-full md:w-80">
              <label className="mb-2 block text-sm font-medium">Filtrar por compañía</label>
              <SearchableSelect
                options={companyOptions}
                value={selectedCompanyId}
                onChange={(value) => setSelectedCompanyId(value ? Number(value) : null)}
                placeholder="Todas las compañías"
              />
            </div>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow">
        <div className="flex flex-col gap-4 border-b border-base-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Centro de campañas</h2>
            <p className="text-sm text-base-content/60">Trabaja en campañas primero y entra a formularios completos solo cuando toque crear o editar.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={`btn ${activeTab === 'campaigns' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('campaigns')}>Campañas</button>
            <button type="button" className={`btn ${activeTab === 'templates' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setActiveTab('templates')}>Plantillas</button>
          </div>
        </div>

        {activeTab === 'templates' ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-3xl border border-base-200 p-4">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Listado de plantillas</h2>
                  <p className="text-sm text-base-content/60">Crea o edita en una pantalla aparte para no mezclar el formulario con el tablero.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/crm/marketing/plantillas/nueva${selectedCompanyId ? `?company_id=${selectedCompanyId}` : ''}`)}
                >
                  <BiPlus className="h-4 w-4" />
                  Nueva plantilla
                </button>
              </div>
              {isLoadingTemplates ? (
                <div className="py-10 text-center"><span className="loading loading-spinner loading-md" /></div>
              ) : templates.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-base-300 p-6 text-sm text-base-content/60">Todavía no hay plantillas registradas.</div>
              ) : (
                <div className="space-y-3">
                  {templates.map((template) => (
                    <div key={template.id} className={`rounded-2xl border p-4 ${selectedTemplateId === template.id ? 'border-primary bg-primary/5' : 'border-base-200'}`}>
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="cursor-pointer" onClick={() => setSelectedTemplateId(template.id)}>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{template.name}</h3>
                            <span className={`badge ${template.is_active ? 'badge-success' : 'badge-ghost'}`}>{template.is_active ? 'Activa' : 'Inactiva'}</span>
                          </div>
                          <div className="mt-1 text-sm text-base-content/70">{template.subject}</div>
                          <div className="mt-2 text-xs text-base-content/50">{template.company?.name || `Compañía #${template.company_id}`}</div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedTemplateId(template.id)}>
                            <BiShow className="h-4 w-4" />
                            Ver
                          </button>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(`/crm/marketing/plantillas/${template.id}/editar`)}>
                            <BiPencil className="h-4 w-4" />
                            Editar
                          </button>
                          {canDeleteTemplates && (
                            <button type="button" className="btn btn-outline btn-sm btn-error" onClick={() => handleTemplateDelete(template)}>
                              <BiTrash className="h-4 w-4" />
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-base-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Vista previa</h2>
              </div>
              {!selectedTemplate ? (
                <div className="rounded-2xl border border-dashed border-base-300 p-6 text-sm text-base-content/60">Selecciona una plantilla para revisar su contenido.</div>
              ) : (
                <>
                  <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                    <div className="text-sm font-semibold">{selectedTemplate.name}</div>
                    <div className="mt-1 text-xs text-base-content/60">{selectedTemplate.company?.name || `Compañía #${selectedTemplate.company_id}`}</div>
                    <div className="mt-4 text-sm text-base-content/60">Asunto</div>
                    <div className="font-semibold">{selectedTemplate.subject}</div>
                    {selectedTemplate.preheader && (
                      <>
                        <div className="mt-4 text-sm text-base-content/60">Preheader</div>
                        <div className="text-sm">{selectedTemplate.preheader}</div>
                      </>
                    )}
                  </div>
                  <div className="mt-4 rounded-2xl border border-base-200 bg-white p-4">
                    <div className="mb-3 text-sm text-base-content/60">Render HTML</div>
                    <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: selectedTemplate.body_html }} />
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="rounded-3xl border border-base-200 bg-base-50 p-4">
                <div className="text-sm text-base-content/60">Campañas</div>
                <div className="mt-2 text-3xl font-bold">{campaignStats.total}</div>
              </div>
              <div className="rounded-3xl border border-base-200 bg-base-50 p-4">
                <div className="text-sm text-base-content/60">Pendientes</div>
                <div className="mt-2 text-3xl font-bold text-warning">{campaignStats.pending}</div>
              </div>
              <div className="rounded-3xl border border-base-200 bg-base-50 p-4">
                <div className="text-sm text-base-content/60">Enviados</div>
                <div className="mt-2 text-3xl font-bold text-success">{campaignStats.sent}</div>
              </div>
              <div className="rounded-3xl border border-base-200 bg-base-50 p-4">
                <div className="text-sm text-base-content/60">Fallidos</div>
                <div className="mt-2 text-3xl font-bold text-error">{campaignStats.failed}</div>
              </div>
            </div>

            <div className="rounded-3xl border border-base-200 p-4">
              <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Listado de campañas</h2>
                  <p className="text-sm text-base-content/60">Abre formularios completos en páginas separadas para crear o editar sin perder contexto.</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => navigate(`/crm/marketing/campanas/nueva${selectedCompanyId ? `?company_id=${selectedCompanyId}` : ''}`)}
                >
                  <BiPlus className="h-4 w-4" />
                  Nueva campaña
                </button>
              </div>
              {isLoadingCampaigns ? (
                <div className="py-10 text-center"><span className="loading loading-spinner loading-md" /></div>
              ) : campaigns.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-base-300 p-6 text-sm text-base-content/60">Todavía no hay campañas registradas.</div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className={`rounded-2xl border p-4 ${selectedCampaignId === campaign.id ? 'border-primary bg-primary/5' : 'border-base-200'}`}>
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div className="cursor-pointer" onClick={() => setSelectedCampaignId(campaign.id)}>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{campaign.name}</h3>
                            <span className={`badge ${badgeClassByStatus[campaign.status] || 'badge-ghost'}`}>{campaignStatusLabel[campaign.status] || campaign.status}</span>
                          </div>
                          <div className="mt-1 text-sm text-base-content/60">{campaign.template?.name || 'Sin plantilla'} · {campaign.company?.name || `Compañía #${campaign.company_id}`}</div>
                          <div className="mt-2 text-xs text-base-content/60">
                            Pendientes: {campaign.pending_count ?? 0} · Enviados: {campaign.sent_count ?? 0} · Fallidos: {campaign.failed_count ?? 0} · Omitidos: {campaign.skipped_count ?? 0}
                          </div>
                          {campaign.last_error && <div className="mt-2 text-xs text-error">{campaign.last_error}</div>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => setSelectedCampaignId(campaign.id)}>
                            <BiShow className="h-4 w-4" />
                            Ver
                          </button>
                          {canManageCampaigns && (
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(`/crm/marketing/campanas/${campaign.id}/editar`)}>
                              <BiPencil className="h-4 w-4" />
                              Editar
                            </button>
                          )}
                          {canSendCampaigns && campaign.status !== 'processing' && campaign.status !== 'sent' && campaign.status !== 'partial' && campaign.status !== 'cancelled' && (
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => handleLaunchCampaign(campaign)} disabled={submittingCampaignAction === campaign.id}>
                              <BiPlay className="h-4 w-4" />
                              Lanzar
                            </button>
                          )}
                          {canSendCampaigns && campaign.status !== 'processing' && campaign.status !== 'sent' && campaign.status !== 'partial' && campaign.status !== 'cancelled' && (
                            <button type="button" className="btn btn-primary btn-sm" onClick={() => handleSendCampaignNow(campaign)} disabled={submittingCampaignAction === campaign.id}>
                              {submittingCampaignAction === campaign.id ? <span className="loading loading-spinner loading-sm" /> : <BiPlay className="h-4 w-4" />}
                              Enviar ahora
                            </button>
                          )}
                          {canSendCampaigns && (campaign.status === 'processing' || campaign.status === 'scheduled') && (
                            <button type="button" className="btn btn-outline btn-sm btn-warning" onClick={() => handleCancelCampaign(campaign)} disabled={submittingCampaignAction === campaign.id}>
                              <BiStop className="h-4 w-4" />
                              Cancelar
                            </button>
                          )}
                          {canDeleteCampaigns && (
                            <button type="button" className="btn btn-outline btn-sm btn-error" onClick={() => handleCampaignDelete(campaign)}>
                              <BiTrash className="h-4 w-4" />
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-base-200 p-4">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Seguimiento de campaña</h2>
                {selectedCampaign && <div className="text-sm text-base-content/60">{selectedCampaign.name}</div>}
              </div>
              {!selectedCampaign ? (
                <div className="rounded-2xl border border-dashed border-base-300 p-6 text-sm text-base-content/60">Selecciona una campaña para ver su estado y la trazabilidad de envío.</div>
              ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                    <div className="text-sm text-base-content/60">Estado actual</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={`badge ${badgeClassByStatus[selectedCampaign.status] || 'badge-ghost'}`}>{campaignStatusLabel[selectedCampaign.status] || selectedCampaign.status}</span>
                      <span className="text-sm text-base-content/60">{selectedCampaign.template?.name || 'Sin plantilla'}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl border border-base-200 p-3">Pendientes: {selectedCampaign.pending_count ?? 0}</div>
                      <div className="rounded-2xl border border-base-200 p-3">Enviados: {selectedCampaign.sent_count ?? 0}</div>
                      <div className="rounded-2xl border border-base-200 p-3">Fallidos: {selectedCampaign.failed_count ?? 0}</div>
                      <div className="rounded-2xl border border-base-200 p-3">Omitidos: {selectedCampaign.skipped_count ?? 0}</div>
                    </div>
                    {selectedCampaign.last_error && <div className="mt-4 rounded-2xl border border-error/30 bg-error/5 p-3 text-sm text-error">{selectedCampaign.last_error}</div>}
                  </div>
                  <div className="rounded-2xl border border-base-200 p-4">
                    <h3 className="mb-3 font-semibold">Destinatarios</h3>
                    {isLoadingRecipients ? (
                      <div className="py-10 text-center"><span className="loading loading-spinner loading-md" /></div>
                    ) : recipients.length === 0 ? (
                      selectedCampaign?.audience_source === 'crm_contacts' ? (
                        isLoadingSelectedCampaignAudiencePreview ? (
                          <div className="py-10 text-center"><span className="loading loading-spinner loading-md" /></div>
                        ) : selectedCampaignAudienceContacts.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-base-300 p-6 text-sm text-base-content/60">
                            No hay destinatarios generados y tampoco hay contactos con correo que cumplan los filtros de esta campaña.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm text-base-content/70">
                              La campaña sigue en proceso y todavía no materializa destinatarios en el backend. Mientras tanto, estos son los contactos con correo que sí cumplen los filtros.
                            </div>
                            <div className="overflow-x-auto">
                              <table className="table">
                                <thead>
                                  <tr>
                                    <th>Nombre</th>
                                    <th>Correo</th>
                                    <th>Cliente</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedCampaignAudienceContacts.map((contact) => (
                                    <tr key={contact.id}>
                                      <td>{contact.name}</td>
                                      <td>{contact.email}</td>
                                      <td>{contact.client?.name || '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="rounded-2xl border border-dashed border-base-300 p-6 text-sm text-base-content/60">
                          Aún no hay destinatarios generados para esta campaña.
                        </div>
                      )
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="table">
                          <thead>
                            <tr>
                              <th>Nombre</th>
                              <th>Correo</th>
                              <th>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recipients.map((recipient) => (
                              <tr key={recipient.id}>
                                <td>{recipient.recipient_name || '-'}</td>
                                <td>{recipient.recipient_email}</td>
                                <td><span className={`badge ${badgeClassByStatus[recipient.status] || 'badge-ghost'}`}>{campaignStatusLabel[recipient.status] || recipient.status}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default CrmMarketingPage;
