import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BiArrowBack, BiPlus, BiSave } from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { companyService } from '../../services/companyService';
import { crmService } from '../../services/crmService';
import { useAuthStore } from '../../stores/authStore';
import type { CrmEmailTemplatePayload } from '../../types/crm';
import { getEmptyTemplateForm, marketingTemplateVariables } from './marketingShared';

const CrmMarketingTemplateFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isGlobalUser = !user?.company_id;
  const userCompanyId = Number(user?.company_id ?? user?.company?.id) || null;
  const companyIdFromQuery = searchParams.get('company_id');
  const templateId = id ? Number(id) : null;
  const isEditing = Boolean(templateId);

  const [templateForm, setTemplateForm] = useState<CrmEmailTemplatePayload>(
    getEmptyTemplateForm(userCompanyId ?? (companyIdFromQuery ? Number(companyIdFromQuery) : null))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [previewSeed, setPreviewSeed] = useState(0);

  const { data: templateData } = useQuery({
    queryKey: ['crm-marketing-template', templateId],
    queryFn: () => crmService.getMarketingTemplate(templateId as number),
    enabled: Boolean(templateId),
  });

  useEffect(() => {
    if (!templateData) return;

    const template = templateData;
    setTemplateForm({
      company_id: template.company_id,
      name: template.name,
      slug: template.slug,
      subject: template.subject,
      preheader: template.preheader ?? '',
      body_html: template.body_html,
      body_text: template.body_text ?? '',
      is_active: template.is_active ?? true,
    });
    setPreviewSeed((value) => value + 1);
  }, [templateData]);

  const { data: companiesData } = useQuery({
    queryKey: ['crm-marketing-companies'],
    queryFn: () => companyService.getCompanies({ per_page: 200 }),
    enabled: isGlobalUser,
  });

  const companyId = isGlobalUser ? (templateForm.company_id ? Number(templateForm.company_id) : null) : userCompanyId;

  const previewPayload = useMemo(() => ({
    company_id: companyId ?? undefined,
    subject: templateForm.subject,
    preheader: templateForm.preheader ?? '',
    body_html: templateForm.body_html,
    body_text: templateForm.body_text ?? '',
    variables: {
      campaign_name: 'Campaña Demo',
    },
  }), [companyId, templateForm.subject, templateForm.preheader, templateForm.body_html, templateForm.body_text]);

  const { data: previewData, isFetching: isFetchingPreview } = useQuery({
    queryKey: ['crm-marketing-preview', previewSeed, previewPayload],
    queryFn: () => crmService.previewMarketingEmail(previewPayload),
    enabled: templateForm.subject.trim() !== '' || templateForm.body_html.trim() !== '',
  });

  const companies = companiesData?.data ?? [];
  const companyOptions = companies.map((company) => ({ value: company.id, label: company.name }));

  const handleSave = async () => {
    if (!templateForm.name.trim() || !templateForm.subject.trim() || !templateForm.body_html.trim()) {
      toast.error('Completa nombre, asunto y cuerpo HTML');
      return;
    }

    if (!companyId) {
      toast.error('Selecciona una compañía para la plantilla');
      return;
    }

    setIsSaving(true);
    try {
      const payload: CrmEmailTemplatePayload = {
        ...templateForm,
        company_id: companyId,
      };

      if (isEditing) {
        await crmService.updateMarketingTemplate(templateId as number, payload);
        toast.success('Plantilla actualizada correctamente');
      } else {
        await crmService.createMarketingTemplate(payload);
        toast.success('Plantilla creada correctamente');
      }

      await queryClient.invalidateQueries({ queryKey: ['crm-marketing-templates'] });
      navigate(`/crm/marketing?tab=templates${companyId ? `&company_id=${companyId}` : ''}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No se pudo guardar la plantilla');
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
            onClick={() => navigate(`/crm/marketing?tab=templates${companyId ? `&company_id=${companyId}` : ''}`)}
          >
            <BiArrowBack className="h-4 w-4" />
            Volver a marketing
          </button>
          <h1 className="text-3xl font-bold">{isEditing ? 'Editar plantilla' : 'Nueva plantilla'}</h1>
          <p className="text-base-content/60">Trabaja la plantilla en una ventana independiente con vista previa en paralelo.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn btn-outline" onClick={() => setPreviewSeed((value) => value + 1)}>Actualizar vista previa</button>
          <button type="button" className="btn btn-primary" disabled={isSaving} onClick={handleSave}>
            {isSaving ? <BiSave className="h-4 w-4 animate-pulse" /> : <BiPlus className="h-4 w-4" />}
            {isSaving ? 'Guardando...' : isEditing ? 'Actualizar plantilla' : 'Crear plantilla'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow">
          <div className="space-y-4">
            {isGlobalUser && (
              <div>
                <label className="mb-2 block text-sm font-medium">Compañía</label>
                <SearchableSelect
                  options={companyOptions}
                  value={templateForm.company_id ?? null}
                  onChange={(value) => setTemplateForm((current) => ({ ...current, company_id: value ? Number(value) : null }))}
                  placeholder="Selecciona compañía"
                />
              </div>
            )}
            <div>
              <label className="mb-2 block text-sm font-medium">Nombre</label>
              <input className="input input-bordered w-full" value={templateForm.name} onChange={(event) => setTemplateForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Slug</label>
              <input className="input input-bordered w-full" value={templateForm.slug ?? ''} onChange={(event) => setTemplateForm((current) => ({ ...current, slug: event.target.value }))} placeholder="newsletter-bienvenida" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Asunto</label>
              <input className="input input-bordered w-full" value={templateForm.subject} onChange={(event) => setTemplateForm((current) => ({ ...current, subject: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Preheader</label>
              <input className="input input-bordered w-full" value={templateForm.preheader ?? ''} onChange={(event) => setTemplateForm((current) => ({ ...current, preheader: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">HTML</label>
              <textarea rows={14} className="textarea textarea-bordered w-full font-mono text-sm" value={templateForm.body_html} onChange={(event) => setTemplateForm((current) => ({ ...current, body_html: event.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Texto plano</label>
              <textarea rows={5} className="textarea textarea-bordered w-full" value={templateForm.body_text ?? ''} onChange={(event) => setTemplateForm((current) => ({ ...current, body_text: event.target.value }))} placeholder="Opcional; si lo dejas vacío se genera desde el HTML." />
            </div>
            <label className="flex items-center gap-2 rounded-2xl border border-base-200 px-3 py-2">
              <input type="checkbox" className="checkbox checkbox-sm" checked={templateForm.is_active ?? true} onChange={(event) => setTemplateForm((current) => ({ ...current, is_active: event.target.checked }))} />
              <span className="text-sm">Plantilla activa</span>
            </label>
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Vista previa</h2>
              {isFetchingPreview && <span className="loading loading-spinner loading-sm" />}
            </div>
            <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
              <div className="mb-2 text-sm text-base-content/60">Asunto</div>
              <div className="font-semibold">{previewData?.subject || templateForm.subject || 'Sin asunto'}</div>
              {(previewData?.preheader || templateForm.preheader) && (
                <>
                  <div className="mt-4 text-sm text-base-content/60">Preheader</div>
                  <div className="text-sm">{previewData?.preheader || templateForm.preheader}</div>
                </>
              )}
            </div>
            <div className="mt-4 rounded-2xl border border-base-200 bg-white p-4">
              <div className="mb-3 text-sm text-base-content/60">Render HTML</div>
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: previewData?.body_html || templateForm.body_html }} />
            </div>
          </div>

          <div className="rounded-3xl border border-dashed border-base-300 bg-base-100 p-4 text-sm text-base-content/70 shadow">
            Variables disponibles: {marketingTemplateVariables.map((variable) => <code key={variable}>{variable} </code>)}
          </div>
        </section>
      </div>
    </div>
  );
};

export default CrmMarketingTemplateFormPage;
