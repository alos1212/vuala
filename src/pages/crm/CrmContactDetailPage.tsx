import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BiArrowBack, BiBriefcase, BiBuilding, BiEnvelope, BiMap, BiPhone, BiTask } from 'react-icons/bi';
import { FaWhatsapp } from 'react-icons/fa';
import { crmService } from '../../services/crmService';
import { whatsappService } from '../../services/whatsappService';
import { useAuthStore } from '../../stores/authStore';

const resolveContactStatus = (status?: number | string | null, isActive?: boolean) => {
  if (status === 'inactive' || status === 0 || status === '0' || isActive === false) return 'Inactivo';
  return 'Activo';
};

const normalizePhone = (value?: string | null) => String(value || '').replace(/[^\d+]/g, '');

const CrmContactDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const contactId = Number(id);
  const canOpenWhatsappInbox = hasPermission('crm.whatsapp.inbox');
  const canListActivities = hasPermission('crm.activities.list');
  const canCreateActivities = hasPermission('crm.activities.create');
  const canUpdateActivities = hasPermission('crm.activities.update');
  const canReadClients = hasPermission('clients.read');

  const { data: contact, isLoading } = useQuery({
    queryKey: ['crm-contact', contactId],
    queryFn: () => crmService.getContact(contactId),
    enabled: Number.isFinite(contactId) && contactId > 0,
  });

  const { data: activitiesData, isLoading: isActivitiesLoading } = useQuery({
    queryKey: ['crm-contact-activities', contactId],
    queryFn: () => crmService.getActivities({ crm_contact_id: contactId, per_page: 20 }),
    enabled: Boolean(contactId) && canListActivities,
  });

  const normalizedPhone = normalizePhone(contact?.phone);
  const { data: conversations = [] } = useQuery({
    queryKey: ['crm-contact-whatsapp-conversations', contact?.company_id, normalizedPhone],
    queryFn: () => whatsappService.getConversations({
      company_id: contact?.company_id,
      search: normalizedPhone || undefined,
    }),
    enabled: Boolean(contact?.company_id) && normalizedPhone !== '' && canOpenWhatsappInbox,
  });

  const whatsappConversation = React.useMemo(() => {
    if (!normalizedPhone) return null;
    return conversations.find((conversation) => normalizePhone(conversation.contact_phone) === normalizedPhone) ?? null;
  }, [conversations, normalizedPhone]);

  const activities = activitiesData?.data ?? [];

  const openWhatsappInbox = () => {
    if (!contact?.phone) return;

    const params = new URLSearchParams({
      company_id: String(contact.company_id),
      phone: contact.phone,
      contact_name: contact.name,
    });

    if (contact.client_id) {
      params.set('client_id', String(contact.client_id));
    }

    navigate(`/crm/whatsapp?${params.toString()}`);
  };

  if (isLoading || !contact) {
    return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg" /></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="app-page-header">
        <div>
          <h1 className="text-3xl font-bold">{contact.name}</h1>
          <p className="text-base-content/60">Resumen general del contacto, sus datos comerciales y sus gestiones recientes.</p>
        </div>
        <div className="app-page-header-actions flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={() => navigate('/contacts')}>
            <BiArrowBack className="w-5 h-5" />
            Volver
          </button>
          {canOpenWhatsappInbox && contact.phone && (
            <button className="btn btn-outline" onClick={openWhatsappInbox}>
              <FaWhatsapp className="w-4 h-4" />
              WhatsApp
            </button>
          )}
          {canCreateActivities && (
            <button className="btn btn-primary" onClick={() => navigate(`/crm/gestiones/nueva?crm_contact_id=${contact.id}`)}>
              <BiTask className="w-5 h-5" />
              Nueva gestión
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
        <div className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
          <div className="text-sm text-base-content/60">Compañía</div>
          <div className="mt-2 text-lg font-semibold">{contact.company?.name || `Compañía #${contact.company_id}`}</div>
        </div>
        <div className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
          <div className="text-sm text-base-content/60">Cliente asociado</div>
          <div className="mt-2 text-lg font-semibold">{contact.client?.name || 'Sin cliente asociado'}</div>
        </div>
        <div className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
          <div className="text-sm text-base-content/60">Gestiones</div>
          <div className="mt-2 text-3xl font-bold">{contact.activities_count ?? activitiesData?.meta?.total ?? activities.length}</div>
        </div>
        <div className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
          <div className="text-sm text-base-content/60">Estado</div>
          <div className="mt-2">
            <span className={`badge ${resolveContactStatus(contact.status, contact.is_active) === 'Activo' ? 'badge-success' : 'badge-ghost'}`}>
              {resolveContactStatus(contact.status, contact.is_active)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow">
          <h2 className="text-xl font-semibold">Resumen del contacto</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-base-200 p-4">
              <div className="flex items-center gap-2 text-sm text-base-content/60">
                <BiBriefcase className="w-4 h-4" />
                Cargo
              </div>
              <div className="mt-2 font-semibold">{contact.position || 'Sin cargo'}</div>
            </div>
            <div className="rounded-2xl border border-base-200 p-4">
              <div className="flex items-center gap-2 text-sm text-base-content/60">
                <BiPhone className="w-4 h-4" />
                Teléfono
              </div>
              <div className="mt-2 font-semibold">{contact.phone || 'Sin teléfono'}</div>
            </div>
            <div className="rounded-2xl border border-base-200 p-4">
              <div className="flex items-center gap-2 text-sm text-base-content/60">
                <BiEnvelope className="w-4 h-4" />
                Correo
              </div>
              <div className="mt-2 font-semibold break-all">{contact.email || 'Sin correo'}</div>
            </div>
            <div className="rounded-2xl border border-base-200 p-4">
              <div className="flex items-center gap-2 text-sm text-base-content/60">
                <BiBuilding className="w-4 h-4" />
                Cliente
              </div>
              <div className="mt-2 font-semibold">{contact.client?.name || 'No asociado'}</div>
              {contact.client && canReadClients && (
                <button
                  type="button"
                  className="mt-3 btn btn-ghost btn-xs"
                  onClick={() => navigate(`/clients/${contact.client?.id}`)}
                >
                  Ver cliente
                </button>
              )}
            </div>
            <div className="rounded-2xl border border-base-200 p-4 md:col-span-2">
              <div className="flex items-center gap-2 text-sm text-base-content/60">
                <BiMap className="w-4 h-4" />
                Dirección
              </div>
              <div className="mt-2 font-semibold whitespace-pre-wrap">{contact.address || 'Sin dirección'}</div>
            </div>
            <div className="rounded-2xl border border-base-200 p-4 md:col-span-2">
              <div className="text-sm text-base-content/60">Notas</div>
              <div className="mt-2 whitespace-pre-wrap">{contact.notes || 'Sin notas registradas'}</div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow">
          <h2 className="text-xl font-semibold">Resumen WhatsApp</h2>
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-base-200 p-4">
              <div className="text-sm text-base-content/60">Teléfono para WhatsApp</div>
              <div className="mt-2 font-semibold">{contact.phone || 'No disponible'}</div>
            </div>
            <div className="rounded-2xl border border-base-200 p-4">
              <div className="text-sm text-base-content/60">Conversación encontrada</div>
              <div className="mt-2 font-semibold">{whatsappConversation ? 'Sí' : 'No'}</div>
              <div className="mt-1 text-sm text-base-content/70">
                {whatsappConversation?.last_message_at
                  ? `Último movimiento: ${new Date(whatsappConversation.last_message_at).toLocaleString()}`
                  : 'Todavía no hay historial asociado a este número.'}
              </div>
            </div>
            <div className="rounded-2xl border border-base-200 p-4">
              <div className="text-sm text-base-content/60">Último mensaje</div>
              <div className="mt-2 whitespace-pre-wrap text-sm">
                {whatsappConversation?.last_message || 'Sin mensajes todavía'}
              </div>
            </div>
            {canOpenWhatsappInbox && contact.phone && (
              <button className="btn btn-success w-full" onClick={openWhatsappInbox}>
                <FaWhatsapp className="w-4 h-4" />
                Abrir en inbox WhatsApp
              </button>
            )}
          </div>
        </section>
      </div>

      {canListActivities && (
        <section className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Gestiones recientes</h2>
              <p className="text-sm text-base-content/60">Actividades CRM relacionadas con este contacto.</p>
            </div>
          </div>

          {isActivitiesLoading ? (
            <div className="py-16 text-center"><span className="loading loading-spinner loading-lg" /></div>
          ) : activities.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-base-300 p-8 text-center text-base-content/60">
              Este contacto todavía no tiene gestiones registradas.
            </div>
          ) : (
            <div className="mt-6 overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Asunto</th>
                    <th>Tipo</th>
                    <th>Responsable</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th className="text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {activities.map((activity) => (
                    <tr key={activity.id}>
                      <td className="font-semibold">{activity.subject}</td>
                      <td>{activity.managementType?.name || '-'}</td>
                      <td>{activity.assignedUser?.name || '-'}</td>
                      <td>{new Date(activity.scheduled_start_at).toLocaleString()}</td>
                      <td>{activity.status}</td>
                      <td>
                        <div className="flex justify-end gap-2">
                          {canUpdateActivities && (
                            <button className="btn btn-outline btn-sm" onClick={() => navigate(`/crm/gestiones/${activity.id}/editar`)}>
                              Ver gestión
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default CrmContactDetailPage;
