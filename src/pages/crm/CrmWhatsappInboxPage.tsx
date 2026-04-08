import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BiCheckCircle, BiSend, BiTask, BiTime } from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { companyService } from '../../services/companyService';
import { whatsappService } from '../../services/whatsappService';
import { useAuthStore } from '../../stores/authStore';

const CrmWhatsappInboxPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const userCompanyId = Number(user?.company_id) || undefined;
  const canListCompanies = hasPermission('companies.list');
  const canReadCompanies = hasPermission('companies.read');
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<number | null>(userCompanyId ?? null);
  const [searchConversation, setSearchConversation] = React.useState('');
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null);
  const [messageDraft, setMessageDraft] = React.useState('');
  const [sendingMessage, setSendingMessage] = React.useState(false);
  const [broadcastPhones, setBroadcastPhones] = React.useState('');
  const [broadcastMessage, setBroadcastMessage] = React.useState('');
  const [sendingBroadcast, setSendingBroadcast] = React.useState(false);

  const resolvedCompanyId = selectedCompanyId ?? userCompanyId ?? null;

  const { data: companiesData } = useQuery({
    queryKey: ['companies-for-whatsapp'],
    queryFn: () => companyService.getCompanies({ per_page: 200 }),
    enabled: canListCompanies,
  });

  const { data: conversations = [], isLoading: isConversationsLoading } = useQuery({
    queryKey: ['whatsapp-conversations', resolvedCompanyId, searchConversation],
    queryFn: () => whatsappService.getConversations({ company_id: resolvedCompanyId ?? undefined, search: searchConversation || undefined }),
    enabled: Boolean(resolvedCompanyId),
    retry: false,
  });

  const { data: messages = [], isLoading: isMessagesLoading } = useQuery({
    queryKey: ['whatsapp-messages', resolvedCompanyId, activeConversationId],
    queryFn: () => whatsappService.getConversationMessages(activeConversationId as string, resolvedCompanyId ?? undefined),
    enabled: Boolean(resolvedCompanyId) && Boolean(activeConversationId),
    retry: false,
  });

  const { data: metaConfig } = useQuery({
    queryKey: ['whatsapp-meta-config', resolvedCompanyId],
    queryFn: () => whatsappService.getMetaConfig(resolvedCompanyId ?? undefined),
    enabled: Boolean(resolvedCompanyId),
    retry: false,
  });

  React.useEffect(() => {
    if (conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
    if (conversations.length === 0) {
      setActiveConversationId(null);
    }
  }, [conversations, activeConversationId]);

  const activeConversation = conversations.find((item) => item.id === activeConversationId) ?? null;

  const handleSendMessage = async () => {
    if (!messageDraft.trim() || !resolvedCompanyId || !activeConversation) return;

    setSendingMessage(true);
    try {
      await whatsappService.sendMessage({
        company_id: resolvedCompanyId,
        conversation_id: activeConversation.id,
        to: activeConversation.contact_phone || undefined,
        message: messageDraft.trim(),
      });
      setMessageDraft('');
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', resolvedCompanyId, activeConversation.id] });
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations', resolvedCompanyId] });
      toast.success('Mensaje enviado correctamente');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No se pudo enviar el mensaje');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleBroadcast = async () => {
    if (!resolvedCompanyId || !broadcastMessage.trim()) {
      toast.error('Completa los datos del envío masivo');
      return;
    }

    const recipients = broadcastPhones
      .split(/[\n,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      toast.error('Agrega al menos un teléfono');
      return;
    }

    setSendingBroadcast(true);
    try {
      await whatsappService.sendBroadcast({
        company_id: resolvedCompanyId,
        recipients,
        message: broadcastMessage.trim(),
      });
      setBroadcastMessage('');
      setBroadcastPhones('');
      toast.success(`Envío masivo ejecutado para ${recipients.length} contactos`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No se pudo ejecutar el envío masivo');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const companyOptions = (companiesData?.data ?? []).map((company) => ({ value: company.id, label: company.name }));
  const totalUnread = conversations.reduce((sum, item) => sum + Number(item.unread_count || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <section className="rounded-[30px] border border-base-200 bg-gradient-to-r from-base-100 via-base-100 to-base-200/70 p-6 shadow">
        <h1 className="text-3xl font-bold">Inbox WhatsApp CRM</h1>
        <p className="mt-2 text-base-content/70">
          Centraliza chats de WhatsApp, responde conversaciones y ejecuta envíos masivos por compañía.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-2xl border border-base-200 bg-base-50 p-3">
            <div className="text-xs text-base-content/60">Conversaciones</div>
            <div className="text-2xl font-bold">{conversations.length}</div>
          </div>
          <div className="rounded-2xl border border-base-200 bg-base-50 p-3">
            <div className="text-xs text-base-content/60">Mensajes sin leer</div>
            <div className="text-2xl font-bold">{totalUnread}</div>
          </div>
          <div className="rounded-2xl border border-base-200 bg-base-50 p-3">
            <div className="text-xs text-base-content/60">Estado integración</div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              {metaConfig?.is_configured ? <BiCheckCircle className="h-4 w-4 text-success" /> : <BiTime className="h-4 w-4 text-warning" />}
              {metaConfig?.is_configured ? 'Configurado' : 'Pendiente de configuración'}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_250px]">
          <label className="form-control w-full">
            <span className="label-text mb-2">Buscar conversación</span>
            <input
              className="input input-bordered w-full"
              value={searchConversation}
              onChange={(event) => setSearchConversation(event.target.value)}
              placeholder="Nombre o teléfono"
            />
          </label>

          <label className="form-control w-full">
            <span className="label-text mb-2">Compañía</span>
            {canListCompanies ? (
              <SearchableSelect
                options={companyOptions}
                value={selectedCompanyId}
                onChange={(value) => setSelectedCompanyId(value ? Number(value) : null)}
                placeholder="Selecciona compañía"
                isClearable={false}
              />
            ) : (
              <input
                className="input input-bordered w-full bg-base-200"
                value={user?.company?.name || `Compañía #${userCompanyId ?? ''}`}
                readOnly
                disabled
              />
            )}
          </label>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_1fr]">
        <aside className="rounded-3xl border border-base-200 bg-base-100 p-4 shadow h-[560px] overflow-auto">
          <h2 className="text-lg font-semibold mb-3">Chats</h2>
          {isConversationsLoading ? (
            <div className="py-10 text-center"><span className="loading loading-spinner loading-md" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-base-content/60">No hay conversaciones disponibles para esta compañía.</p>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  type="button"
                  className={`w-full rounded-2xl border p-3 text-left transition ${
                    activeConversationId === conversation.id
                      ? 'border-primary bg-primary/8'
                      : 'border-base-200 bg-base-50 hover:bg-base-100'
                  }`}
                  onClick={() => setActiveConversationId(conversation.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{conversation.contact_name || conversation.contact_phone || 'Sin nombre'}</div>
                      <div className="text-xs text-base-content/60 truncate">{conversation.contact_phone || 'Sin teléfono'}</div>
                    </div>
                    {Number(conversation.unread_count || 0) > 0 && (
                      <span className="badge badge-primary badge-sm">{conversation.unread_count}</span>
                    )}
                  </div>
                  <div className="mt-2 text-sm text-base-content/70 line-clamp-2">{conversation.last_message || 'Sin mensajes'}</div>
                </button>
              ))}
            </div>
          )}
        </aside>

        <div className="rounded-3xl border border-base-200 bg-base-100 p-4 shadow h-[560px] flex flex-col">
          <div className="border-b border-base-200 pb-3 mb-3">
            <h2 className="text-lg font-semibold">
              {activeConversation?.contact_name || activeConversation?.contact_phone || 'Selecciona un chat'}
            </h2>
            <p className="text-sm text-base-content/60">
              {activeConversation?.contact_phone || 'No hay conversación activa'}
            </p>
          </div>

          <div className="flex-1 overflow-auto space-y-3 pr-1">
            {isMessagesLoading ? (
              <div className="py-10 text-center"><span className="loading loading-spinner loading-md" /></div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-base-content/60">
                No hay mensajes para mostrar.
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    message.direction === 'outbound'
                      ? 'ml-auto bg-primary text-primary-content'
                      : 'bg-base-200 text-base-content'
                  }`}
                >
                  <div>{message.body}</div>
                  <div className={`mt-1 text-[11px] ${message.direction === 'outbound' ? 'text-primary-content/80' : 'text-base-content/60'}`}>
                    {message.sent_at ? new Date(message.sent_at).toLocaleString() : ''}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              className="input input-bordered w-full"
              placeholder="Escribe tu respuesta..."
              value={messageDraft}
              onChange={(event) => setMessageDraft(event.target.value)}
              disabled={!activeConversationId || sendingMessage}
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleSendMessage}
              disabled={!activeConversationId || !messageDraft.trim() || sendingMessage}
            >
              <BiSend className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow space-y-3">
          <div className="flex items-center gap-2">
            <BiTask className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Envío masivo</h3>
          </div>
          <p className="text-sm text-base-content/60">
            Envía un mensaje a múltiples teléfonos. Escribe uno por línea o separados por coma.
          </p>

          <label className="form-control w-full">
            <span className="label-text mb-2">Teléfonos destino</span>
            <textarea
              rows={5}
              className="textarea textarea-bordered w-full"
              placeholder="573001112233&#10;573004445566"
              value={broadcastPhones}
              onChange={(event) => setBroadcastPhones(event.target.value)}
            />
          </label>

          <label className="form-control w-full">
            <span className="label-text mb-2">Mensaje</span>
            <textarea
              rows={4}
              className="textarea textarea-bordered w-full"
              placeholder="Hola, este es un mensaje masivo..."
              value={broadcastMessage}
              onChange={(event) => setBroadcastMessage(event.target.value)}
            />
          </label>

          <div className="flex justify-end">
            <button type="button" className="btn btn-primary" onClick={handleBroadcast} disabled={sendingBroadcast}>
              {sendingBroadcast ? 'Enviando...' : 'Enviar masivo'}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow space-y-3">
          <h3 className="text-lg font-semibold">Configuración de integración</h3>
          <p className="text-sm text-base-content/60">
            La configuración de llaves Meta/WhatsApp ahora se administra desde el detalle de la compañía.
          </p>
          <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
            <div className="text-sm text-base-content/60">Estado actual</div>
            <div className="mt-1 flex items-center gap-2 text-sm">
              {metaConfig?.is_configured ? <BiCheckCircle className="h-4 w-4 text-success" /> : <BiTime className="h-4 w-4 text-warning" />}
              {metaConfig?.is_configured ? 'Configuración completa' : 'Faltan llaves de integración'}
            </div>
          </div>
          {resolvedCompanyId && canReadCompanies && (
            <div className="flex justify-end">
              <button type="button" className="btn btn-outline" onClick={() => navigate(`/companies/${resolvedCompanyId}`)}>
                Ir a la compañía
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default CrmWhatsappInboxPage;
