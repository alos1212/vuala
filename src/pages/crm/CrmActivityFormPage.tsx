import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { clientService } from '../../services/clientService';
import { companyService } from '../../services/companyService';
import { crmService } from '../../services/crmService';
import { useAuthStore } from '../../stores/authStore';
import type { ClientContact } from '../../types/client';
import type { CrmActivity, CrmActivityPayload, CrmContact } from '../../types/crm';

type RelationMode = 'client' | 'crm_contact';

interface CrmActivityFormValues {
  relation_mode: RelationMode;
  company_id: number | null;
  client_id: number | null;
  client_contact_id: number | null;
  crm_contact_id: number | null;
  management_type_id: number | null;
  result_type_id: number | null;
  assigned_user_id: number | null;
  subject: string;
  description: string;
  status: CrmActivity['status'];
  priority: CrmActivity['priority'];
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  location_name: string;
  address: string;
  scheduled_start_at: string;
  scheduled_end_at: string;
  completed_at: string;
  follow_up_at: string;
  requires_follow_up: boolean;
  result_notes: string;
}

const toLocalInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const getApiErrorMessage = (error: any, fallback: string): string => {
  const errorData = error?.response?.data;
  const validationErrors = errorData?.errors;

  if (validationErrors && typeof validationErrors === 'object') {
    for (const key of Object.keys(validationErrors)) {
      const fieldErrors = validationErrors[key];
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        return String(fieldErrors[0]);
      }
    }
  }

  const message = String(errorData?.message || '').trim();
  return message || fallback;
};

const buildContactOptionLabel = (contact: CrmContact) => {
  const pieces = [contact.name];
  if (contact.client?.name) pieces.push(contact.client.name);
  if (contact.company?.name) pieces.push(contact.company.name);
  return pieces.join(' · ');
};

const getDefaultFormValues = (crmContactId: number | null, clientId: number | null): CrmActivityFormValues => ({
  relation_mode: crmContactId ? 'crm_contact' : 'client',
  company_id: null,
  client_id: clientId,
  client_contact_id: null,
  crm_contact_id: crmContactId,
  management_type_id: null,
  result_type_id: null,
  assigned_user_id: null,
  subject: '',
  description: '',
  status: 'scheduled',
  priority: 'medium',
  contact_name: '',
  contact_phone: '',
  contact_email: '',
  location_name: '',
  address: '',
  scheduled_start_at: '',
  scheduled_end_at: '',
  completed_at: '',
  follow_up_at: '',
  requires_follow_up: false,
  result_notes: '',
});

const mapActivityToFormValues = (activity: CrmActivity): CrmActivityFormValues => {
  const usesClientLinkedContact = Boolean(activity.crm_contact_id && (activity.crmContact?.client_id ?? activity.client_id));

  return {
    relation_mode: usesClientLinkedContact || !activity.crm_contact_id ? 'client' : 'crm_contact',
    company_id: activity.company_id ?? null,
    client_id: activity.client_id ?? null,
    client_contact_id: usesClientLinkedContact ? activity.crm_contact_id ?? null : activity.client_contact_id ?? null,
    crm_contact_id: usesClientLinkedContact ? null : activity.crm_contact_id ?? null,
    management_type_id: activity.management_type_id,
    result_type_id: activity.result_type_id ?? null,
    assigned_user_id: activity.assigned_user_id ?? null,
    subject: activity.subject,
    description: activity.description ?? '',
    status: activity.status,
    priority: activity.priority,
    contact_name: activity.contact_name ?? '',
    contact_phone: activity.contact_phone ?? '',
    contact_email: activity.contact_email ?? '',
    location_name: activity.location_name ?? '',
    address: activity.address ?? '',
    scheduled_start_at: toLocalInput(activity.scheduled_start_at),
    scheduled_end_at: toLocalInput(activity.scheduled_end_at),
    completed_at: toLocalInput(activity.completed_at),
    follow_up_at: toLocalInput(activity.follow_up_at),
    requires_follow_up: activity.requires_follow_up ?? false,
    result_notes: activity.result_notes ?? '',
  };
};

const CrmActivityFormPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const userCompanyId = Number(user?.company_id ?? user?.company?.id) || null;
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id);
  const initialCrmContactId = Number(searchParams.get('crm_contact_id') || '') || null;
  const initialClientId = Number(searchParams.get('client_id') || '') || null;

  const { data: clientsData } = useQuery({
    queryKey: ['crm-form-clients'],
    queryFn: () => clientService.getClients({ per_page: 500 }),
  });
  const clients = clientsData?.data ?? [];

  const { data: crmContactsData } = useQuery({
    queryKey: ['crm-form-crm-contacts'],
    queryFn: () => crmService.getContacts({ per_page: 500 }),
  });
  const crmContacts = crmContactsData?.data ?? [];

  const { data: users = [] } = useQuery({
    queryKey: ['crm-form-company-users'],
    queryFn: () => companyService.getMyCompanyUsers().catch(() => []),
  });

  const { data: types = [] } = useQuery({
    queryKey: ['crm-types'],
    queryFn: () => crmService.getManagementTypes(),
  });

  const { data: results = [] } = useQuery({
    queryKey: ['crm-results'],
    queryFn: () => crmService.getResultTypes(),
  });

  const { data: activity } = useQuery({
    queryKey: ['crm-activity', id],
    queryFn: () => crmService.getActivity(Number(id)),
    enabled: isEdit,
  });

  const { register, control, handleSubmit, watch, reset, setValue, getValues } = useForm<CrmActivityFormValues>({
    defaultValues: getDefaultFormValues(initialCrmContactId, initialClientId),
  });

  React.useEffect(() => {
    if (activity) {
      reset(mapActivityToFormValues(activity));
      return;
    }

    if (!isEdit) {
      reset(getDefaultFormValues(initialCrmContactId, initialClientId));
    }
  }, [activity, initialClientId, initialCrmContactId, isEdit, reset]);

  const relationMode = watch('relation_mode');
  const currentClientId = watch('client_id');
  const currentClientContactId = watch('client_contact_id');
  const currentCrmContactId = watch('crm_contact_id');
  const currentClient = clients.find((client) => client.id === currentClientId) ?? null;
  const currentContacts = currentClient?.contacts ?? [];
  const currentCrmContact = crmContacts.find((contact) => contact.id === currentCrmContactId) ?? null;
  const currentLinkedClientContact = currentContacts.find((contact) => contact.id === currentClientContactId) ?? null;
  const previousClientIdRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (relationMode === 'crm_contact' && getValues('client_contact_id')) {
      setValue('client_contact_id', null);
    }

    if (relationMode === 'client' && getValues('crm_contact_id')) {
      setValue('crm_contact_id', null);
    }
  }, [getValues, relationMode, setValue]);

  React.useEffect(() => {
    const previousClientId = previousClientIdRef.current;
    previousClientIdRef.current = currentClientId ?? null;

    if (previousClientId === null || previousClientId === currentClientId) {
      return;
    }

    setValue('client_contact_id', null);
  }, [currentClientId, setValue]);

  React.useEffect(() => {
    if (relationMode !== 'crm_contact') return;

    const nextClientId = currentCrmContact?.client_id ?? null;
    if (getValues('client_id') !== nextClientId) {
      setValue('client_id', nextClientId);
    }
  }, [currentCrmContact, getValues, relationMode, setValue]);

  React.useEffect(() => {
    const sourceContact: ClientContact | CrmContact | null = relationMode === 'client'
      ? currentLinkedClientContact
      : currentCrmContact;

    if (!sourceContact) return;

    if (!getValues('contact_name')?.trim() && sourceContact.name) {
      setValue('contact_name', sourceContact.name);
    }
    if (!getValues('contact_phone')?.trim() && sourceContact.phone) {
      setValue('contact_phone', sourceContact.phone);
    }
    if (!getValues('contact_email')?.trim() && sourceContact.email) {
      setValue('contact_email', sourceContact.email);
    }
  }, [currentCrmContact, currentLinkedClientContact, getValues, relationMode, setValue]);

  const onSubmit = async (values: CrmActivityFormValues) => {
    const resolvedClient = clients.find((client) => client.id === values.client_id) ?? null;
    const resolvedLinkedClientContact = currentContacts.find((contact) => contact.id === values.client_contact_id) ?? null;
    const resolvedCrmContact = crmContacts.find((contact) => contact.id === values.crm_contact_id) ?? null;
    const resolvedCompanyId = resolvedClient?.company_id ?? resolvedCrmContact?.company_id ?? userCompanyId;

    if (values.relation_mode === 'client' && !values.client_id) {
      toast.error('Selecciona un cliente');
      return;
    }

    if (values.relation_mode === 'crm_contact' && !values.crm_contact_id) {
      toast.error('Selecciona un contacto CRM');
      return;
    }

    if (!values.management_type_id) {
      toast.error('Selecciona un tipo de gestión');
      return;
    }

    if (!values.subject.trim()) {
      toast.error('El asunto es obligatorio');
      return;
    }

    if (!values.scheduled_start_at) {
      toast.error('Selecciona la fecha programada');
      return;
    }

    if (!resolvedCompanyId) {
      toast.error('No se pudo determinar la compañía de la gestión');
      return;
    }

    const payload: CrmActivityPayload = {
      company_id: resolvedCompanyId,
      client_id: values.client_id,
      client_contact_id: values.relation_mode === 'client' && !resolvedLinkedClientContact ? values.client_contact_id : null,
      crm_contact_id: values.relation_mode === 'crm_contact' ? values.crm_contact_id : resolvedLinkedClientContact?.id ?? null,
      management_type_id: Number(values.management_type_id),
      result_type_id: values.result_type_id ? Number(values.result_type_id) : null,
      assigned_user_id: values.assigned_user_id ? Number(values.assigned_user_id) : null,
      subject: values.subject.trim(),
      description: values.description.trim(),
      status: values.status,
      priority: values.priority,
      contact_name: values.contact_name.trim(),
      contact_phone: values.contact_phone.trim(),
      contact_email: values.contact_email.trim(),
      location_name: values.location_name.trim(),
      address: values.address.trim(),
      scheduled_start_at: new Date(values.scheduled_start_at).toISOString(),
      scheduled_end_at: values.scheduled_end_at ? new Date(values.scheduled_end_at).toISOString() : null,
      completed_at: values.completed_at ? new Date(values.completed_at).toISOString() : null,
      follow_up_at: values.follow_up_at ? new Date(values.follow_up_at).toISOString() : null,
      requires_follow_up: values.requires_follow_up,
      result_notes: values.result_notes.trim(),
    };

    try {
      if (isEdit && id) {
        await crmService.updateActivity(Number(id), payload);
        toast.success('Gestión actualizada');
      } else {
        await crmService.createActivity(payload);
        toast.success('Gestión creada');
      }

      await queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
      navigate('/crm/gestiones');
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'No se pudo guardar la gestión'));
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? 'Editar gestión' : 'Nueva gestión'}</h1>
          <p className="text-base-content/60">Registra una actividad CRM ligada a un cliente o a un contacto CRM independiente.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/crm/gestiones')}>
          Volver
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <label className="form-control">
            <span className="label-text mb-1">Tipo de relación</span>
            <Controller
              control={control}
              name="relation_mode"
              render={({ field }) => (
                <SearchableSelect
                  options={[
                    { value: 'client', label: 'Cliente / contacto de cliente' },
                    { value: 'crm_contact', label: 'Contacto independiente' },
                  ]}
                  value={field.value}
                  onChange={(value) => field.onChange((value as RelationMode) || 'client')}
                  placeholder="Selecciona un tipo"
                  isClearable={false}
                />
              )}
            />
          </label>

          {relationMode === 'client' ? (
            <>
              <label className="form-control">
                <span className="label-text mb-1">Cliente</span>
                <Controller
                  control={control}
                  name="client_id"
                  render={({ field }) => (
                    <SearchableSelect
                      options={clients.map((client) => ({ value: client.id, label: client.name }))}
                      value={field.value}
                      onChange={(value) => field.onChange(value ? Number(value) : null)}
                      placeholder="Selecciona un cliente"
                      isClearable
                    />
                  )}
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Contacto asociado</span>
                <Controller
                  control={control}
                  name="client_contact_id"
                  render={({ field }) => (
                    <SearchableSelect
                      options={currentContacts.map((contact) => ({ value: contact.id, label: contact.name }))}
                      value={field.value}
                      onChange={(value) => field.onChange(value ? Number(value) : null)}
                      placeholder={currentClient ? 'Opcional' : 'Primero selecciona un cliente'}
                      isDisabled={!currentClient}
                      isClearable
                    />
                  )}
                />
              </label>
            </>
          ) : (
            <>
              <label className="form-control lg:col-span-2">
                <span className="label-text mb-1">Contacto independiente</span>
                <Controller
                  control={control}
                  name="crm_contact_id"
                  render={({ field }) => (
                    <SearchableSelect
                      options={crmContacts.map((contact) => ({ value: contact.id, label: buildContactOptionLabel(contact) }))}
                      value={field.value}
                      onChange={(value) => field.onChange(value ? Number(value) : null)}
                      placeholder="Selecciona un contacto CRM"
                      isClearable
                    />
                  )}
                />
              </label>
              <div className="rounded-2xl border border-base-200 bg-base-50 px-4 py-3 text-sm text-base-content/70">
                <div className="font-medium text-base-content">Contexto del contacto</div>
                <div className="mt-1">{currentCrmContact?.company?.name || (currentCrmContact ? `Compañía #${currentCrmContact.company_id}` : 'Sin compañía seleccionada')}</div>
                <div>{currentCrmContact?.client?.name || 'Sin cliente asociado'}</div>
              </div>
            </>
          )}

          <label className="form-control">
            <span className="label-text mb-1">Responsable</span>
            <Controller
              control={control}
              name="assigned_user_id"
              render={({ field }) => (
                <SearchableSelect
                  options={users.map((entry) => ({ value: entry.id, label: entry.name }))}
                  value={field.value}
                  onChange={(value) => field.onChange(value ? Number(value) : null)}
                  placeholder="Selecciona un usuario"
                  isClearable
                />
              )}
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Tipo de gestión</span>
            <Controller
              control={control}
              name="management_type_id"
              render={({ field }) => (
                <SearchableSelect
                  options={types.map((type) => ({ value: type.id, label: type.name }))}
                  value={field.value}
                  onChange={(value) => field.onChange(value ? Number(value) : null)}
                  placeholder="Selecciona un tipo"
                  isClearable={false}
                />
              )}
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Resultado</span>
            <Controller
              control={control}
              name="result_type_id"
              render={({ field }) => (
                <SearchableSelect
                  options={results.map((result) => ({ value: result.id, label: result.name }))}
                  value={field.value}
                  onChange={(value) => field.onChange(value ? Number(value) : null)}
                  placeholder="Selecciona un resultado"
                  isClearable
                />
              )}
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Fecha programada</span>
            <input className="input input-bordered" type="datetime-local" {...register('scheduled_start_at')} />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Fecha fin</span>
            <input className="input input-bordered" type="datetime-local" {...register('scheduled_end_at')} />
          </label>

          <label className="form-control lg:col-span-2">
            <span className="label-text mb-1">Asunto</span>
            <input className="input input-bordered" {...register('subject')} />
          </label>

          <label className="form-control lg:col-span-3">
            <span className="label-text mb-1">Descripción</span>
            <textarea className="textarea textarea-bordered" rows={4} {...register('description')} />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Nombre del contacto</span>
            <input className="input input-bordered" {...register('contact_name')} />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Teléfono del contacto</span>
            <input className="input input-bordered" {...register('contact_phone')} />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Correo del contacto</span>
            <input className="input input-bordered" type="email" {...register('contact_email')} />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Estado</span>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <SearchableSelect
                  options={[
                    { value: 'scheduled', label: 'Programada' },
                    { value: 'pending', label: 'Pendiente' },
                    { value: 'completed', label: 'Completada' },
                    { value: 'rescheduled', label: 'Reprogramada' },
                    { value: 'cancelled', label: 'Cancelada' },
                  ]}
                  value={field.value}
                  onChange={(value) => field.onChange((value as CrmActivity['status']) ?? 'scheduled')}
                  placeholder="Selecciona un estado"
                  isClearable={false}
                />
              )}
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Prioridad</span>
            <Controller
              control={control}
              name="priority"
              render={({ field }) => (
                <SearchableSelect
                  options={[
                    { value: 'low', label: 'Baja' },
                    { value: 'medium', label: 'Media' },
                    { value: 'high', label: 'Alta' },
                    { value: 'urgent', label: 'Urgente' },
                  ]}
                  value={field.value}
                  onChange={(value) => field.onChange((value as CrmActivity['priority']) ?? 'medium')}
                  placeholder="Selecciona prioridad"
                  isClearable={false}
                />
              )}
            />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Seguimiento</span>
            <input className="input input-bordered" type="datetime-local" {...register('follow_up_at')} />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Completada en</span>
            <input className="input input-bordered" type="datetime-local" {...register('completed_at')} />
          </label>

          <label className="form-control">
            <span className="label-text mb-1">Ubicación</span>
            <input className="input input-bordered" {...register('location_name')} />
          </label>

          <label className="form-control lg:col-span-2">
            <span className="label-text mb-1">Dirección</span>
            <input className="input input-bordered" {...register('address')} />
          </label>

          <label className="form-control lg:col-span-3">
            <span className="label-text mb-1">Notas del resultado</span>
            <textarea className="textarea textarea-bordered" rows={3} {...register('result_notes')} />
          </label>

          <label className="label cursor-pointer justify-start gap-3 lg:col-span-3">
            <input type="checkbox" className="checkbox checkbox-primary" {...register('requires_follow_up')} />
            <span className="label-text">Requiere seguimiento</span>
          </label>
        </div>

        <div className="flex justify-end">
          <button className="btn btn-primary" type="submit">
            {isEdit ? 'Guardar cambios' : 'Crear gestión'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CrmActivityFormPage;
