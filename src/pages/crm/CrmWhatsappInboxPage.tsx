import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BiCheckCircle, BiSend, BiTask, BiTime } from 'react-icons/bi';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { clientService } from '../../services/clientService';
import { companyService } from '../../services/companyService';
import { geoService } from '../../services/geoService';
import { whatsappService } from '../../services/whatsappService';
import { useAuthStore } from '../../stores/authStore';

const CrmWhatsappInboxPage: React.FC = () => {
  const REALTIME_REFRESH_MS = 1000;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const userCompanyId = Number(user?.company_id) || undefined;
  const canListCompanies = hasPermission('companies.list');
  const canReadCompanies = hasPermission('companies.read');
  const [activeTab, setActiveTab] = React.useState<'chat' | 'send'>('chat');
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<number | null>(userCompanyId ?? null);
  const [searchConversation, setSearchConversation] = React.useState('');
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null);
  const [sendMode, setSendMode] = React.useState<'text' | 'template'>('text');
  const [messageDraft, setMessageDraft] = React.useState('');
  const [selectedTemplateKey, setSelectedTemplateKey] = React.useState<string | null>(null);
  const [templateVariables, setTemplateVariables] = React.useState<string[]>(['', '', '', '', '']);
  const [sendingMessage, setSendingMessage] = React.useState(false);
  const [broadcastPhones, setBroadcastPhones] = React.useState('');
  const [broadcastTargetType, setBroadcastTargetType] = React.useState<'specific' | 'client' | 'geo'>('specific');
  const [broadcastSendMode, setBroadcastSendMode] = React.useState<'text' | 'template'>('text');
  const [broadcastTemplateKey, setBroadcastTemplateKey] = React.useState<string | null>(null);
  const [broadcastTemplateVariables, setBroadcastTemplateVariables] = React.useState<string[]>([
    user?.name || '',
    '',
    '',
    '',
    '',
  ]);
  const [chatVariableSources, setChatVariableSources] = React.useState<string[]>([]);
  const [broadcastVariableSources, setBroadcastVariableSources] = React.useState<string[]>([]);
  const [selectedBroadcastClientId, setSelectedBroadcastClientId] = React.useState<number | null>(null);
  const [clientContactSendMode, setClientContactSendMode] = React.useState<'all' | 'one'>('all');
  const [selectedBroadcastContactId, setSelectedBroadcastContactId] = React.useState<number | null>(null);
  const [includeClientContacts, setIncludeClientContacts] = React.useState(true);
  const [broadcastCountryId, setBroadcastCountryId] = React.useState<number | null>(null);
  const [broadcastStateId, setBroadcastStateId] = React.useState<number | null>(null);
  const [broadcastCityId, setBroadcastCityId] = React.useState<number | null>(null);
  const [broadcastMessage, setBroadcastMessage] = React.useState('');
  const [sendingBroadcast, setSendingBroadcast] = React.useState(false);
  const [markingReadConversationId, setMarkingReadConversationId] = React.useState<string | null>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);

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
    refetchInterval: Boolean(resolvedCompanyId) ? REALTIME_REFRESH_MS : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: messages = [], isLoading: isMessagesLoading } = useQuery({
    queryKey: ['whatsapp-messages', resolvedCompanyId, activeConversationId],
    queryFn: () => whatsappService.getConversationMessages(activeConversationId as string, resolvedCompanyId ?? undefined),
    enabled: Boolean(resolvedCompanyId) && Boolean(activeConversationId),
    refetchInterval: Boolean(resolvedCompanyId) && Boolean(activeConversationId) ? REALTIME_REFRESH_MS : false,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const { data: metaConfig, isLoading: isMetaConfigLoading } = useQuery({
    queryKey: ['whatsapp-meta-config', resolvedCompanyId],
    queryFn: () => whatsappService.getMetaConfig(resolvedCompanyId ?? undefined),
    enabled: Boolean(resolvedCompanyId),
    retry: false,
  });

  const parseTemplateKey = (key: string | null): { name: string; language: string } | null => {
    if (!key) return null;
    const [name = '', language = 'es_CO'] = key.split('::');
    if (!name) return null;
    return { name, language: language || 'es_CO' };
  };

  const chatTemplateSelection = parseTemplateKey(selectedTemplateKey);
  const broadcastTemplateSelection = parseTemplateKey(broadcastTemplateKey);

  const { data: chatTemplatePreview } = useQuery({
    queryKey: ['whatsapp-template-preview-chat', resolvedCompanyId, chatTemplateSelection?.name, chatTemplateSelection?.language],
    queryFn: () => whatsappService.getTemplatePreview({
      company_id: resolvedCompanyId ?? undefined,
      template_name: chatTemplateSelection?.name || '',
      template_language: chatTemplateSelection?.language || 'es_CO',
    }),
    enabled: sendMode === 'template' && Boolean(resolvedCompanyId) && Boolean(chatTemplateSelection?.name),
    retry: false,
  });

  const { data: broadcastTemplatePreview } = useQuery({
    queryKey: ['whatsapp-template-preview-broadcast', resolvedCompanyId, broadcastTemplateSelection?.name, broadcastTemplateSelection?.language],
    queryFn: () => whatsappService.getTemplatePreview({
      company_id: resolvedCompanyId ?? undefined,
      template_name: broadcastTemplateSelection?.name || '',
      template_language: broadcastTemplateSelection?.language || 'es_CO',
    }),
    enabled: broadcastSendMode === 'template' && Boolean(resolvedCompanyId) && Boolean(broadcastTemplateSelection?.name),
    retry: false,
  });

  const { data: clientsData } = useQuery({
    queryKey: ['clients-for-whatsapp-broadcast', resolvedCompanyId],
    queryFn: () => clientService.getClients({ company_id: resolvedCompanyId ?? undefined, per_page: 200 }),
    enabled: Boolean(resolvedCompanyId),
    retry: false,
  });
  const { data: broadcastClientContacts = [] } = useQuery({
    queryKey: ['client-contacts-for-broadcast', selectedBroadcastClientId],
    queryFn: () => clientService.getContacts(selectedBroadcastClientId as number),
    enabled: Boolean(selectedBroadcastClientId),
    retry: false,
  });

  const { data: countries = [] } = useQuery({
    queryKey: ['geo-countries'],
    queryFn: geoService.getCountries,
  });
  const { data: states = [] } = useQuery({
    queryKey: ['geo-states', broadcastCountryId],
    queryFn: () => geoService.getStatesByCountry(broadcastCountryId as number),
    enabled: Boolean(broadcastCountryId),
  });
  const { data: cities = [] } = useQuery({
    queryKey: ['geo-cities', broadcastStateId],
    queryFn: () => geoService.getCitiesByState(broadcastStateId as number),
    enabled: Boolean(broadcastStateId),
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
  const activeClientType = activeConversation?.client?.client_type;
  const activeClientLabel = activeClientType === 'person'
    ? 'Persona'
    : activeClientType === 'company'
      ? `Empresa: ${activeConversation?.client?.name || 'Sin nombre'}`
      : 'Contacto WhatsApp';

  React.useEffect(() => {
    const markAsRead = async () => {
      if (!resolvedCompanyId || !activeConversation) return;
      if (Number(activeConversation.unread_count || 0) <= 0) return;
      if (markingReadConversationId === activeConversation.id) return;

      setMarkingReadConversationId(activeConversation.id);
      try {
        await whatsappService.markConversationAsRead(activeConversation.id, resolvedCompanyId);
        await queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations', resolvedCompanyId] });
      } finally {
        setMarkingReadConversationId(null);
      }
    };

    void markAsRead();
  }, [activeConversation, markingReadConversationId, queryClient, resolvedCompanyId]);

  React.useEffect(() => {
    if (!activeConversationId) return;
    const container = messagesContainerRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [activeConversationId, messages]);

  const availableTemplates = React.useMemo(() => {
    const raw = Array.isArray(metaConfig?.templates) ? metaConfig?.templates : [];
    return raw
      .filter((template) => template?.name && template?.is_active !== false)
      .map((template) => ({
        name: String(template.name),
        language: String(template.language || 'es_CO'),
        label: String(template.label || template.name),
        body: String(template.body_text || template.body || ''),
        components: Array.isArray(template.components) ? template.components : [],
      }));
  }, [metaConfig?.templates]);

  React.useEffect(() => {
    if (availableTemplates.length === 0) {
      setSelectedTemplateKey(null);
      setBroadcastTemplateKey(null);
      return;
    }

    const defaultName = String(metaConfig?.default_template_name || '');
    const defaultLanguage = String(metaConfig?.default_template_language || 'es_CO');
    const preferredKey = defaultName ? `${defaultName}::${defaultLanguage}` : null;
    const hasPreferred = preferredKey
      ? availableTemplates.some((template) => `${template.name}::${template.language}` === preferredKey)
      : false;

    if (hasPreferred && preferredKey) {
      setSelectedTemplateKey(preferredKey);
      setBroadcastTemplateKey((prev) => prev || preferredKey);
      return;
    }

    if (!selectedTemplateKey) {
      setSelectedTemplateKey(`${availableTemplates[0].name}::${availableTemplates[0].language}`);
    }
    if (!broadcastTemplateKey) {
      setBroadcastTemplateKey(`${availableTemplates[0].name}::${availableTemplates[0].language}`);
    }
  }, [availableTemplates, metaConfig?.default_template_language, metaConfig?.default_template_name, selectedTemplateKey, broadcastTemplateKey]);

  React.useEffect(() => {
    setTemplateVariables((prev) => {
      const next = [...prev];
      next[0] = activeConversation?.contact_name || activeConversation?.client?.name || '';
      return next;
    });
  }, [activeConversation?.client?.name, activeConversation?.contact_name]);

  React.useEffect(() => {
    if (!broadcastCountryId) {
      setBroadcastStateId(null);
      setBroadcastCityId(null);
    }
  }, [broadcastCountryId]);

  React.useEffect(() => {
    if (!broadcastStateId) {
      setBroadcastCityId(null);
    }
  }, [broadcastStateId]);

  React.useEffect(() => {
    if (!selectedBroadcastClientId) return;
    const selectedClient = (clientsData?.data ?? []).find((client) => client.id === selectedBroadcastClientId);
    if (!selectedClient?.name) return;

    setBroadcastTemplateVariables((prev) => {
      const next = [...prev];
      next[0] = selectedClient.name;
      return next;
    });
  }, [clientsData?.data, selectedBroadcastClientId]);

  React.useEffect(() => {
    setSelectedBroadcastContactId(null);
    setClientContactSendMode('all');
  }, [selectedBroadcastClientId]);

  const selectedCompanyName = (companiesData?.data ?? []).find((item) => item.id === resolvedCompanyId)?.name || '';
  const selectedBroadcastClient = (clientsData?.data ?? []).find((item) => item.id === selectedBroadcastClientId);
  const selectedBroadcastContact = broadcastClientContacts.find((item) => item.id === selectedBroadcastContactId);
  const selectedCountryName = countries.find((item) => item.id === broadcastCountryId)?.name || '';
  const selectedStateName = states.find((item) => item.id === broadcastStateId)?.name || '';
  const selectedCityName = cities.find((item) => item.id === broadcastCityId)?.name || '';

  React.useEffect(() => {
    const indexes = chatTemplatePreview?.variable_indexes ?? [];
    if (indexes.length === 0) return;

    setTemplateVariables((prev) =>
      indexes.map((index) => prev[index - 1] ?? (index === 1 ? (activeConversation?.contact_name || activeConversation?.client?.name || '') : ''))
    );
    setChatVariableSources((prev) => indexes.map((_, index) => prev[index] ?? 'manual'));
  }, [chatTemplatePreview?.variable_indexes, activeConversation?.contact_name, activeConversation?.client?.name]);

  React.useEffect(() => {
    const indexes = broadcastTemplatePreview?.variable_indexes ?? [];
    if (indexes.length === 0) return;

    setBroadcastTemplateVariables((prev) =>
      indexes.map((index) => prev[index - 1] ?? (index === 1 ? (selectedBroadcastClient?.name || user?.name || '') : ''))
    );
    setBroadcastVariableSources((prev) => indexes.map((_, index) => prev[index] ?? 'manual'));
  }, [broadcastTemplatePreview?.variable_indexes, selectedBroadcastClient?.name, user?.name]);

  const resolveSourceValue = (mode: 'chat' | 'broadcast', source: string): string => {
    if (mode === 'chat') {
      if (source === 'contact_name') return activeConversation?.contact_name || activeConversation?.client?.name || '';
      if (source === 'company_name') return activeConversation?.client?.company?.name || selectedCompanyName;
      if (source === 'country') return selectedCountryName;
      if (source === 'state') return selectedStateName;
      if (source === 'city') return selectedCityName;
      return '';
    }

    if (source === 'contact_name') return selectedBroadcastContact?.name || selectedBroadcastClient?.name || '';
    if (source === 'company_name') return selectedCompanyName;
    if (source === 'country') return selectedCountryName;
    if (source === 'state') return selectedStateName;
    if (source === 'city') return selectedCityName;
    return '';
  };

  const templateSourceOptions = [
    { value: 'manual', label: 'Manual' },
    { value: 'contact_name', label: 'Nombre contacto' },
    { value: 'company_name', label: 'Nombre empresa' },
    { value: 'country', label: 'País' },
    { value: 'state', label: 'Estado' },
    { value: 'city', label: 'Ciudad' },
  ];

  const handleSendMessage = async () => {
    if (!resolvedCompanyId || !activeConversation) return;
    if (sendMode === 'text' && !messageDraft.trim()) return;
    if (sendMode === 'template' && !selectedTemplateKey) return;

    setSendingMessage(true);
    try {
      const payload: {
        company_id?: number;
        conversation_id?: string;
        to?: string;
        message?: string;
        template_name?: string;
        template_language?: string;
        template_variables?: string[];
      } = {
        company_id: resolvedCompanyId,
        conversation_id: activeConversation.id,
        to: activeConversation.contact_phone || undefined,
      };

      if (sendMode === 'template') {
        const [templateName = '', templateLanguage = 'es_CO'] = (selectedTemplateKey || '').split('::');
        payload.template_name = templateName;
        payload.template_language = templateLanguage || 'es_CO';
        payload.template_variables = [...templateVariables];
        payload.message = buildTemplatePreview(selectedTemplateKey, templateVariables);
      } else {
        payload.message = messageDraft.trim();
      }

      await whatsappService.sendMessage({
        ...payload,
      });
      setMessageDraft('');
      if (sendMode === 'template') {
        setTemplateVariables((prev) =>
          prev.map((_, index) => (index === 0 ? (activeConversation?.contact_name || activeConversation?.client?.name || '') : ''))
        );
      }
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
    if (!resolvedCompanyId) {
      toast.error('Selecciona una compañía');
      return;
    }

    const payload: {
      company_id?: number;
      recipients?: string[];
      message?: string;
      template_name?: string;
      template_language?: string;
      template_variables?: string[];
      recipient_client_id?: number;
      country_id?: number;
      state_id?: number;
      city_id?: number;
      include_client_contacts?: boolean;
    } = {
      company_id: resolvedCompanyId,
      include_client_contacts: includeClientContacts,
    };

    if (broadcastSendMode === 'template') {
      if (!broadcastTemplateKey) {
        toast.error('Selecciona una plantilla');
        return;
      }
      const [templateName = '', templateLanguage = 'es_CO'] = broadcastTemplateKey.split('::');
      payload.template_name = templateName;
      payload.template_language = templateLanguage || 'es_CO';
      payload.template_variables = [...broadcastTemplateVariables];
    } else {
      if (!broadcastMessage.trim()) {
        toast.error('Escribe el mensaje para enviar');
        return;
      }
      payload.message = broadcastMessage.trim();
    }

    if (broadcastTargetType === 'specific') {
      const recipients = broadcastPhones
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter(Boolean);
      if (recipients.length === 0) {
        toast.error('Agrega al menos un teléfono');
        return;
      }
      payload.recipients = recipients;
    } else if (broadcastTargetType === 'client') {
      if (!selectedBroadcastClientId) {
        toast.error('Selecciona una empresa o cliente');
        return;
      }
      payload.recipient_client_id = selectedBroadcastClientId;
      if (clientContactSendMode === 'one') {
        if (!selectedBroadcastContactId) {
          toast.error('Selecciona el contacto específico');
          return;
        }
        payload.recipient_contact_id = selectedBroadcastContactId;
      }
    } else {
      if (!broadcastCountryId && !broadcastStateId && !broadcastCityId) {
        toast.error('Selecciona al menos país, estado o ciudad');
        return;
      }
      payload.country_id = broadcastCountryId ?? undefined;
      payload.state_id = broadcastStateId ?? undefined;
      payload.city_id = broadcastCityId ?? undefined;
    }

    setSendingBroadcast(true);
    try {
      await whatsappService.sendBroadcast(payload);
      setBroadcastMessage('');
      setBroadcastPhones('');
      setBroadcastTemplateVariables((prev) =>
        prev.map((_, index) => (index === 0 ? (selectedBroadcastClient?.name || user?.name || '') : ''))
      );
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations', resolvedCompanyId] });
      toast.success('Envío ejecutado correctamente');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No se pudo ejecutar el envío');
    } finally {
      setSendingBroadcast(false);
    }
  };

  const handleComposerKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    if (!activeConversationId || !messageDraft.trim() || sendingMessage || sendMode !== 'text') return;
    void handleSendMessage();
  };

  const companyOptions = (companiesData?.data ?? []).map((company) => ({ value: company.id, label: company.name }));
  const clientOptions = (clientsData?.data ?? [])
    .map((client) => ({
      value: client.id,
      label: `${client.name}${client.phone ? ` · ${client.phone}` : ''}`,
    }));
  const clientContactOptions = (broadcastClientContacts ?? [])
    .map((contact) => ({
      value: contact.id,
      label: `${contact.name}${contact.phone ? ` · ${contact.phone}` : ''}`,
    }));
  const buildTemplatePreview = (templateKey: string | null, values: string[], bodyText?: string) => {
    if (!templateKey) return 'Selecciona una plantilla para ver la vista previa.';
    if (!bodyText?.trim()) {
      const selected = availableTemplates.find((template) => `${template.name}::${template.language}` === templateKey);
      return selected?.label || 'Mensaje automático';
    }

    return bodyText.replace(/\{\{\s*(\d+)\s*\}\}/g, (_match, indexText: string) => {
      const variableIndex = Number(indexText) - 1;
      const resolvedValue = values[variableIndex]?.trim();
      return resolvedValue || `{{${indexText}}}`;
    });
  };
  const totalUnread = conversations.reduce((sum, item) => sum + Number(item.unread_count || 0), 0);
  const isGeoFilterMode = broadcastTargetType === 'geo';
  const isClientFilterMode = broadcastTargetType === 'client';
  const isSpecificMode = broadcastTargetType === 'specific';
  const tabNavClass = 'flex flex-wrap items-end gap-1 border-b border-base-300';
  const tabButtonBaseClass =
    '-mb-px inline-flex items-center justify-center rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
  const tabButtonActiveClass = 'border-primary text-primary bg-base-100';
  const tabButtonInactiveClass = 'border-transparent text-base-content/70 hover:text-base-content hover:border-base-300';
  const isCompanyConfigured = Boolean(metaConfig?.is_configured);

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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="form-control w-full">
            <span className="label-text mb-2">Buscar conversación</span>
            <input
              className="input input-bordered w-full"
              value={searchConversation}
              onChange={(event) => setSearchConversation(event.target.value)}
              placeholder="Nombre o teléfono"
              disabled={!resolvedCompanyId || !isCompanyConfigured}
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
      <section className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow">
        {!resolvedCompanyId ? (
          <div className="rounded-2xl border border-base-200 bg-base-50 p-6 text-sm text-base-content/70">
            Selecciona una compañía para usar el Inbox de WhatsApp.
          </div>
        ) : isMetaConfigLoading ? (
          <div className="py-12 text-center">
            <span className="loading loading-spinner loading-md" />
          </div>
        ) : !isCompanyConfigured ? (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-6">
            <h3 className="text-base font-semibold text-warning-content">Configuración pendiente</h3>
            <p className="mt-2 text-sm text-base-content/80">
              Esta compañía aún no tiene la integración de WhatsApp (Meta) configurada. Configúrala para habilitar el Inbox y los envíos.
            </p>
            {resolvedCompanyId && canReadCompanies && (
              <div className="mt-4">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(`/companies/${resolvedCompanyId}`)}>
                  Ir a configurar compañía
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className={`${tabNavClass}`}>
              <button
                type="button"
                className={`${tabButtonBaseClass} ${activeTab === 'chat' ? tabButtonActiveClass : tabButtonInactiveClass}`}
                onClick={() => setActiveTab('chat')}
              >
                Chats
              </button>
              <button
                type="button"
                className={`${tabButtonBaseClass} ${activeTab === 'send' ? tabButtonActiveClass : tabButtonInactiveClass}`}
                onClick={() => setActiveTab('send')}
              >
                Envíos
              </button>
            </div>

            <div className="pt-5">
              {activeTab === 'chat' ? (
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_1fr]">
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
                              <div className="flex min-w-0 items-start gap-2">
                                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-green-600">
                                  <FaWhatsapp className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">{conversation.contact_name || conversation.contact_phone || 'Sin nombre'}</div>
                                  <div className="text-xs text-base-content/60 truncate">{conversation.contact_phone || 'Sin teléfono'}</div>
                                  <div className="mt-1">
                                    {conversation.client?.client_type === 'person' && (
                                      <span className="badge badge-info badge-xs">Persona</span>
                                    )}
                                    {conversation.client?.client_type === 'company' && (
                                      <span className="badge badge-secondary badge-xs">
                                        Empresa: {conversation.client?.name || 'Sin nombre'}
                                      </span>
                                    )}
                                    {!conversation.client?.client_type && (
                                      <span className="badge badge-ghost badge-xs">Contacto</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              {Number(conversation.unread_count || 0) > 0 && (
                                <span className="badge badge-primary badge-sm">{conversation.unread_count}</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </aside>

                  <div className="rounded-3xl border border-base-200 bg-base-100 p-4 shadow h-[560px] flex flex-col">
                    <div className="border-b border-base-200 pb-3 mb-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                          <FaWhatsapp className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold">
                            {activeConversation?.contact_name || activeConversation?.contact_phone || 'Selecciona un chat'}
                          </h2>
                          <p className="text-sm text-base-content/60">
                            {activeConversation?.contact_phone || 'No hay conversación activa'}
                          </p>
                          {activeConversation && (
                            <p className="mt-1 text-xs text-base-content/70">{activeClientLabel}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div ref={messagesContainerRef} className="flex-1 overflow-auto space-y-3 pr-1">
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

                    <div className="mt-3 space-y-3">
                      <div className={`${tabNavClass}`}>
                        <button
                          type="button"
                          className={`${tabButtonBaseClass} ${sendMode === 'text' ? tabButtonActiveClass : tabButtonInactiveClass}`}
                          onClick={() => setSendMode('text')}
                        >
                          Texto
                        </button>
                        <button
                          type="button"
                          className={`${tabButtonBaseClass} ${sendMode === 'template' ? tabButtonActiveClass : tabButtonInactiveClass}`}
                          onClick={() => setSendMode('template')}
                        >
                          Plantilla
                        </button>
                      </div>

                      {sendMode === 'template' ? (
                        <div className="space-y-3 rounded-2xl border border-base-200 p-3">
                          <label className="form-control w-full">
                            <span className="label-text mb-2">Plantilla</span>
                            <SearchableSelect
                              options={availableTemplates.map((template) => ({
                                value: `${template.name}::${template.language}`,
                                label: `${template.label} (${template.language})`,
                              }))}
                              value={selectedTemplateKey}
                              onChange={(value) => setSelectedTemplateKey(value ? String(value) : null)}
                              placeholder="Selecciona una plantilla"
                              isDisabled={!activeConversationId || sendingMessage || availableTemplates.length === 0}
                              isClearable={false}
                            />
                          </label>

                          <div className="grid grid-cols-1 gap-2">
                            {(chatTemplatePreview?.variable_indexes ?? []).map((variableNumber, index) => (
                              <div key={`template-var-${variableNumber}`} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_220px]">
                                <label className="form-control w-full">
                                  <span className="label-text mb-1 text-xs">Variable {`{{${variableNumber}}}`}</span>
                                  <input
                                    className="input input-bordered w-full"
                                    placeholder={variableNumber === 1 ? 'Nombre del contacto' : `Valor para {{${variableNumber}}}`}
                                    value={templateVariables[variableNumber - 1] ?? ''}
                                    onChange={(event) => {
                                      const nextValues = [...templateVariables];
                                      nextValues[variableNumber - 1] = event.target.value;
                                      setTemplateVariables(nextValues);
                                    }}
                                    disabled={!activeConversationId || sendingMessage}
                                  />
                                </label>
                                <label className="form-control w-full">
                                  <span className="label-text mb-1 text-xs">Cargar desde</span>
                                  <SearchableSelect
                                    options={templateSourceOptions}
                                    value={chatVariableSources[index] || 'manual'}
                                    onChange={(value) => {
                                      const source = String(value || 'manual');
                                      setChatVariableSources((prev) => {
                                        const next = [...prev];
                                        next[index] = source;
                                        return next;
                                      });
                                      if (source !== 'manual') {
                                        const nextValues = [...templateVariables];
                                        nextValues[variableNumber - 1] = resolveSourceValue('chat', source);
                                        setTemplateVariables(nextValues);
                                      }
                                    }}
                                    placeholder="Manual"
                                    isDisabled={!activeConversationId || sendingMessage}
                                    isClearable={false}
                                  />
                                </label>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-base-content/60">
                            Por defecto, la variable {`{{1}}`} se llena con el nombre del contacto activo.
                          </p>
                          <div className="rounded-xl border border-base-200 bg-base-50 px-3 py-2 text-sm">
                            <div className="text-xs text-base-content/60 mb-1">Vista previa</div>
                            <div className="whitespace-pre-wrap">{buildTemplatePreview(selectedTemplateKey, templateVariables, chatTemplatePreview?.body_text)}</div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <input
                            className="input input-bordered w-full"
                            placeholder="Escribe tu respuesta..."
                            value={messageDraft}
                            onChange={(event) => setMessageDraft(event.target.value)}
                            onKeyDown={handleComposerKeyDown}
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
                      )}

                      {sendMode === 'template' && (
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSendMessage}
                            disabled={!activeConversationId || !selectedTemplateKey || sendingMessage}
                          >
                            <BiSend className="w-4 h-4" />
                            Enviar plantilla
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm space-y-4">
                  <div className="flex items-center gap-2">
                    <BiTask className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-semibold">Centro de envíos</h3>
                  </div>
                  <p className="text-sm text-base-content/60">
                    Envía por números específicos, por empresa/cliente o por filtros geográficos (país, estado, ciudad).
                  </p>

                  <div className={`${tabNavClass}`}>
                    <button
                      type="button"
                      className={`${tabButtonBaseClass} ${broadcastSendMode === 'text' ? tabButtonActiveClass : tabButtonInactiveClass}`}
                      onClick={() => setBroadcastSendMode('text')}
                    >
                      Texto
                    </button>
                    <button
                      type="button"
                      className={`${tabButtonBaseClass} ${broadcastSendMode === 'template' ? tabButtonActiveClass : tabButtonInactiveClass}`}
                      onClick={() => setBroadcastSendMode('template')}
                    >
                      Plantilla
                    </button>
                  </div>

                  {broadcastSendMode === 'template' ? (
                    <div className="space-y-3 rounded-2xl border border-base-200 p-3">
                      <label className="form-control w-full">
                        <span className="label-text mb-2">Plantilla</span>
                        <SearchableSelect
                          options={availableTemplates.map((template) => ({
                            value: `${template.name}::${template.language}`,
                            label: `${template.label} (${template.language})`,
                          }))}
                          value={broadcastTemplateKey}
                          onChange={(value) => setBroadcastTemplateKey(value ? String(value) : null)}
                          placeholder="Selecciona una plantilla"
                          isDisabled={sendingBroadcast || availableTemplates.length === 0}
                          isClearable={false}
                        />
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {(broadcastTemplatePreview?.variable_indexes ?? []).map((variableNumber, index) => (
                          <div key={`broadcast-template-var-${variableNumber}`} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_220px]">
                            <label className="form-control w-full">
                              <span className="label-text mb-1 text-xs">Variable {`{{${variableNumber}}}`}</span>
                              <input
                                className="input input-bordered w-full"
                                placeholder={variableNumber === 1 ? 'Nombre (por defecto)' : `Valor para {{${variableNumber}}}`}
                                value={broadcastTemplateVariables[variableNumber - 1] ?? ''}
                                onChange={(event) => {
                                  const next = [...broadcastTemplateVariables];
                                  next[variableNumber - 1] = event.target.value;
                                  setBroadcastTemplateVariables(next);
                                }}
                                disabled={sendingBroadcast}
                              />
                            </label>
                            <label className="form-control w-full">
                              <span className="label-text mb-1 text-xs">Cargar desde</span>
                              <SearchableSelect
                                options={templateSourceOptions}
                                value={broadcastVariableSources[index] || 'manual'}
                                onChange={(value) => {
                                  const source = String(value || 'manual');
                                  setBroadcastVariableSources((prev) => {
                                    const next = [...prev];
                                    next[index] = source;
                                    return next;
                                  });
                                  if (source !== 'manual') {
                                    const nextValues = [...broadcastTemplateVariables];
                                    nextValues[variableNumber - 1] = resolveSourceValue('broadcast', source);
                                    setBroadcastTemplateVariables(nextValues);
                                  }
                                }}
                                placeholder="Manual"
                                isDisabled={sendingBroadcast}
                                isClearable={false}
                              />
                            </label>
                          </div>
                        ))}
                      </div>
                      <div className="rounded-xl border border-base-200 bg-base-50 px-3 py-2 text-sm">
                        <div className="text-xs text-base-content/60 mb-1">Vista previa</div>
                        <div className="whitespace-pre-wrap">{buildTemplatePreview(broadcastTemplateKey, broadcastTemplateVariables, broadcastTemplatePreview?.body_text)}</div>
                      </div>
                    </div>
                  ) : (
                    <label className="form-control w-full">
                      <span className="label-text mb-2">Mensaje</span>
                      <textarea
                        rows={4}
                        className="textarea textarea-bordered w-full"
                        placeholder="Hola, este es un mensaje..."
                        value={broadcastMessage}
                        onChange={(event) => setBroadcastMessage(event.target.value)}
                      />
                    </label>
                  )}

                  <div className={`${tabNavClass}`}>
                    <button
                      type="button"
                      className={`${tabButtonBaseClass} ${isSpecificMode ? tabButtonActiveClass : tabButtonInactiveClass}`}
                      onClick={() => setBroadcastTargetType('specific')}
                    >
                      Números
                    </button>
                    <button
                      type="button"
                      className={`${tabButtonBaseClass} ${isClientFilterMode ? tabButtonActiveClass : tabButtonInactiveClass}`}
                      onClick={() => setBroadcastTargetType('client')}
                    >
                      Empresa/Cliente
                    </button>
                    <button
                      type="button"
                      className={`${tabButtonBaseClass} ${isGeoFilterMode ? tabButtonActiveClass : tabButtonInactiveClass}`}
                      onClick={() => setBroadcastTargetType('geo')}
                    >
                      País/Estado/Ciudad
                    </button>
                  </div>

                  {isSpecificMode && (
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
                  )}

                  {isClientFilterMode && (
                    <div className="space-y-3">
                      <label className="form-control w-full">
                        <span className="label-text mb-2">Selecciona empresa/cliente</span>
                        <SearchableSelect
                          options={clientOptions}
                          value={selectedBroadcastClientId}
                          onChange={(value) => setSelectedBroadcastClientId(value ? Number(value) : null)}
                          placeholder="Selecciona un cliente"
                          isClearable
                        />
                      </label>

                      {selectedBroadcastClientId && (
                        <>
                          <div className="tabs tabs-boxed w-fit">
                            <button
                              type="button"
                              className={`tab ${clientContactSendMode === 'all' ? 'tab-active' : ''}`}
                              onClick={() => setClientContactSendMode('all')}
                            >
                              Todos los contactos
                            </button>
                            <button
                              type="button"
                              className={`tab ${clientContactSendMode === 'one' ? 'tab-active' : ''}`}
                              onClick={() => setClientContactSendMode('one')}
                            >
                              Un contacto
                            </button>
                          </div>

                          {clientContactSendMode === 'one' && (
                            <label className="form-control w-full">
                              <span className="label-text mb-2">Contacto específico</span>
                              <SearchableSelect
                                options={clientContactOptions}
                                value={selectedBroadcastContactId}
                                onChange={(value) => setSelectedBroadcastContactId(value ? Number(value) : null)}
                                placeholder="Selecciona un contacto"
                                isClearable
                              />
                            </label>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {isGeoFilterMode && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <label className="form-control w-full">
                        <span className="label-text mb-2">País</span>
                        <SearchableSelect
                          options={countries.map((country) => ({ value: country.id, label: country.name }))}
                          value={broadcastCountryId}
                          onChange={(value) => setBroadcastCountryId(value ? Number(value) : null)}
                          placeholder="Todos"
                          isClearable
                        />
                      </label>
                      <label className="form-control w-full">
                        <span className="label-text mb-2">Estado</span>
                        <SearchableSelect
                          options={states.map((state) => ({ value: state.id, label: state.name }))}
                          value={broadcastStateId}
                          onChange={(value) => setBroadcastStateId(value ? Number(value) : null)}
                          placeholder={broadcastCountryId ? 'Todos' : 'Selecciona país'}
                          isDisabled={!broadcastCountryId}
                          isClearable
                        />
                      </label>
                      <label className="form-control w-full">
                        <span className="label-text mb-2">Ciudad</span>
                        <SearchableSelect
                          options={cities.map((city) => ({ value: city.id, label: city.name }))}
                          value={broadcastCityId}
                          onChange={(value) => setBroadcastCityId(value ? Number(value) : null)}
                          placeholder={broadcastStateId ? 'Todas' : 'Selecciona estado'}
                          isDisabled={!broadcastStateId}
                          isClearable
                        />
                      </label>
                    </div>
                  )}

                  <label className="flex items-center gap-2 rounded-xl border border-base-200 px-3 py-2">
                    <input
                      type="checkbox"
                      className="checkbox checkbox-sm"
                      checked={includeClientContacts}
                      onChange={(event) => setIncludeClientContacts(event.target.checked)}
                    />
                    <span className="text-sm">Incluir también teléfonos de contactos</span>
                  </label>

                  <div className="flex justify-end">
                    <button type="button" className="btn btn-primary" onClick={handleBroadcast} disabled={sendingBroadcast}>
                      {sendingBroadcast ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default CrmWhatsappInboxPage;
