import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { crmService } from '../../services/crmService';
import { clientService } from '../../services/clientService';
import { companyService } from '../../services/companyService';
import type { CrmActivityPayload } from '../../types/crm';
import SearchableSelect from '../../components/ui/SearchableSelect';

const toLocalInput = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
};

const CrmActivityFormPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);

  const { data: clientsData } = useQuery({
    queryKey: ['crm-form-clients'],
    queryFn: () => clientService.getClients({ per_page: 200 }),
  });
  const clients = clientsData?.data ?? [];

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

  const { register, control, handleSubmit, watch, reset } = useForm<CrmActivityPayload>({
    values: activity ? {
      client_id: activity.client_id,
      client_contact_id: activity.client_contact_id ?? undefined,
      management_type_id: activity.management_type_id,
      result_type_id: activity.result_type_id ?? undefined,
      assigned_user_id: activity.assigned_user_id ?? undefined,
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
    } : {
      client_id: 0,
      management_type_id: 0,
      subject: '',
      scheduled_start_at: '',
      status: 'scheduled',
      priority: 'medium',
      requires_follow_up: false,
    },
  });

  React.useEffect(() => {
    if (activity) {
      reset({
        client_id: activity.client_id,
        client_contact_id: activity.client_contact_id ?? undefined,
        management_type_id: activity.management_type_id,
        result_type_id: activity.result_type_id ?? undefined,
        assigned_user_id: activity.assigned_user_id ?? undefined,
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
      });
    }
  }, [activity, reset]);

  const currentClientId = Number(watch('client_id'));
  const currentClient = clients.find((client) => client.id === currentClientId);
  const currentContacts = currentClient?.contacts ?? [];

  const onSubmit = async (values: CrmActivityPayload) => {
    const payload = {
      ...values,
      client_id: Number(values.client_id),
      client_contact_id: values.client_contact_id ? Number(values.client_contact_id) : null,
      management_type_id: Number(values.management_type_id),
      result_type_id: values.result_type_id ? Number(values.result_type_id) : null,
      assigned_user_id: values.assigned_user_id ? Number(values.assigned_user_id) : null,
      scheduled_start_at: new Date(values.scheduled_start_at).toISOString(),
      scheduled_end_at: values.scheduled_end_at ? new Date(values.scheduled_end_at).toISOString() : null,
      completed_at: values.completed_at ? new Date(values.completed_at).toISOString() : null,
      follow_up_at: values.follow_up_at ? new Date(values.follow_up_at).toISOString() : null,
    };

    if (isEdit && id) {
      await crmService.updateActivity(Number(id), payload);
    } else {
      await crmService.createActivity(payload);
    }

    queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
    navigate('/crm/gestiones');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? 'Editar gestión' : 'Nueva gestión'}</h1>
          <p className="text-base-content/60">Registra una actividad CRM ligada a un cliente y a uno de sus contactos.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/crm/gestiones')}>
          Volver
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="form-control">
            <span className="label-text mb-1">Cliente</span>
            <Controller
              control={control}
              name="client_id"
              render={({ field }) => (
                <SearchableSelect
                  options={clients.map((client) => ({ value: client.id, label: client.name }))}
                  value={field.value && field.value > 0 ? field.value : null}
                  onChange={(value) => field.onChange(value ? Number(value) : 0)}
                  placeholder="Selecciona un cliente"
                  isClearable={false}
                />
              )}
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1">Contacto</span>
            <Controller
              control={control}
              name="client_contact_id"
              render={({ field }) => (
                <SearchableSelect
                  options={currentContacts.map((contact) => ({ value: contact.id, label: contact.name }))}
                  value={field.value ?? null}
                  onChange={(value) => field.onChange(value ? Number(value) : undefined)}
                  placeholder="Selecciona un contacto"
                  isClearable
                />
              )}
            />
          </label>
          <label className="form-control">
            <span className="label-text mb-1">Responsable</span>
            <Controller
              control={control}
              name="assigned_user_id"
              render={({ field }) => (
                <SearchableSelect
                  options={users.map((user) => ({ value: user.id, label: user.name }))}
                  value={field.value ?? null}
                  onChange={(value) => field.onChange(value ? Number(value) : undefined)}
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
                  value={field.value && field.value > 0 ? field.value : null}
                  onChange={(value) => field.onChange(value ? Number(value) : 0)}
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
                  value={field.value ?? null}
                  onChange={(value) => field.onChange(value ? Number(value) : undefined)}
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
          <label className="form-control md:col-span-2 xl:col-span-3">
            <span className="label-text mb-1">Asunto</span>
            <input className="input input-bordered" {...register('subject')} />
          </label>
          <label className="form-control md:col-span-2 xl:col-span-3">
            <span className="label-text mb-1">Descripción</span>
            <textarea className="textarea textarea-bordered" rows={4} {...register('description')} />
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
                  onChange={(value) => field.onChange(value ?? 'scheduled')}
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
                  onChange={(value) => field.onChange(value ?? 'medium')}
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
