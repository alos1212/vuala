import type { CrmEmailCampaignPayload, CrmEmailTemplatePayload } from '../../types/crm';

export const getEmptyTemplateForm = (companyId?: number | null): CrmEmailTemplatePayload => ({
  company_id: companyId ?? null,
  name: '',
  slug: '',
  subject: '',
  preheader: '',
  body_html: '<div style="font-family: Arial, sans-serif; font-size: 16px;"><p>Hola {{contact_name}},</p><p>Gracias por seguir conectado con {{company_name}}.</p><p>Queríamos compartirte esta novedad contigo.</p></div>',
  body_text: '',
  is_active: true,
});

export const getEmptyCampaignForm = (companyId?: number | null): CrmEmailCampaignPayload => ({
  company_id: companyId ?? null,
  template_id: 0,
  name: '',
  status: 'draft',
  audience_source: 'crm_contacts',
  audience_filters: {
    segment_by: 'clients',
    client_ids: [],
    contact_ids: [],
    excluded_contact_ids: [],
    only_active: true,
    client_id: null,
    country_id: null,
    state_id: null,
    city_id: null,
    role_id: null,
  },
  reply_to_email: '',
  reply_to_name: '',
  subject_override: '',
  preheader_override: '',
  body_html_override: '',
  body_text_override: '',
  scheduled_at: '',
});

export const badgeClassByStatus: Record<string, string> = {
  draft: 'badge-ghost',
  scheduled: 'badge-info',
  processing: 'badge-warning',
  sent: 'badge-success',
  partial: 'badge-accent',
  failed: 'badge-error',
  cancelled: 'badge-neutral',
  pending: 'badge-warning',
};

export const campaignStatusLabel: Record<string, string> = {
  draft: 'Borrador',
  scheduled: 'Programada',
  processing: 'En proceso',
  sent: 'Enviada',
  partial: 'Parcial',
  failed: 'Fallida',
  cancelled: 'Cancelada',
  pending: 'Pendiente',
};

export const marketingTemplateVariables = [
  '{{contact_name}}',
  '{{company_name}}',
  '{{client_name}}',
  '{{email}}',
  '{{phone}}',
  '{{position}}',
  '{{campaign_name}}',
  '{{today}}',
];

export const toDateTimeParts = (value?: string | null) => {
  if (!value) {
    return { date: undefined as Date | undefined, time: '' };
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const parsedDate = new Date(normalized);

  if (Number.isNaN(parsedDate.getTime())) {
    return { date: undefined as Date | undefined, time: '' };
  }

  const time = `${String(parsedDate.getHours()).padStart(2, '0')}:${String(parsedDate.getMinutes()).padStart(2, '0')}`;

  return { date: parsedDate, time };
};

export const combineDateAndTime = (date?: Date, time?: string) => {
  if (!date) return '';

  const [hours, minutes] = (time || '09:00').split(':').map((part) => Number(part));
  const nextDate = new Date(date);
  nextDate.setHours(Number.isFinite(hours) ? hours : 9, Number.isFinite(minutes) ? minutes : 0, 0, 0);

  const year = nextDate.getFullYear();
  const month = String(nextDate.getMonth() + 1).padStart(2, '0');
  const day = String(nextDate.getDate()).padStart(2, '0');
  const hh = String(nextDate.getHours()).padStart(2, '0');
  const mm = String(nextDate.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hh}:${mm}`;
};
