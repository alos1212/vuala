import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BiCheckCircle, BiFile, BiPaperclip, BiSend, BiSmile, BiTask, BiTime, BiX } from 'react-icons/bi';
import EmojiPicker, { type EmojiClickData, EmojiStyle, Theme } from 'emoji-picker-react';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { clientService } from '../../services/clientService';
import { companyService } from '../../services/companyService';
import { geoService } from '../../services/geoService';
import { whatsappService } from '../../services/whatsappService';
import { useAuthStore } from '../../stores/authStore';
import type { WhatsappConversation } from '../../types/whatsapp';

interface DirectChatTarget {
  phone: string;
  contactName: string;
  companyId: number;
  clientId?: number | null;
}

const normalizePhoneValue = (value?: string | null) => String(value || '').replace(/[^\d+]/g, '');

const CrmWhatsappInboxPage: React.FC = () => {
  const REALTIME_REFRESH_MS = 1000;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const userCompanyId = Number(user?.company_id) || undefined;
  const requestedCompanyId = Number(searchParams.get('company_id') || '') || null;
  const requestedPhone = normalizePhoneValue(searchParams.get('phone'));
  const requestedContactName = String(searchParams.get('contact_name') || '').trim();
  const requestedClientId = Number(searchParams.get('client_id') || '') || null;
  const canListCompanies = hasPermission('companies.list');
  const canReadCompanies = hasPermission('companies.read');
  const [activeTab, setActiveTab] = React.useState<'chat' | 'send'>('chat');
  const [selectedCompanyId, setSelectedCompanyId] = React.useState<number | null>(requestedCompanyId ?? userCompanyId ?? null);
  const [searchConversation, setSearchConversation] = React.useState('');
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null);
  const [directChatTarget, setDirectChatTarget] = React.useState<DirectChatTarget | null>(null);
  const [pendingConversationPhone, setPendingConversationPhone] = React.useState<string | null>(null);
  const [isTemplateComposerOpen, setIsTemplateComposerOpen] = React.useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = React.useState(false);
  const [messageDraft, setMessageDraft] = React.useState('');
  const [selectedAttachment, setSelectedAttachment] = React.useState<File | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = React.useState<string | null>(null);
  const [selectedTemplateHeaderMedia, setSelectedTemplateHeaderMedia] = React.useState<File | null>(null);
  const [templateVariables, setTemplateVariables] = React.useState<string[]>(['', '', '', '', '']);
  const [sendingMessage, setSendingMessage] = React.useState(false);
  const [broadcastPhones, setBroadcastPhones] = React.useState('');
  const [broadcastTargetType, setBroadcastTargetType] = React.useState<'specific' | 'client' | 'geo'>('specific');
  const [broadcastSendMode, setBroadcastSendMode] = React.useState<'text' | 'template'>('text');
  const [broadcastTemplateKey, setBroadcastTemplateKey] = React.useState<string | null>(null);
  const [broadcastTemplateHeaderMedia, setBroadcastTemplateHeaderMedia] = React.useState<File | null>(null);
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
  const [broadcastClientSearch, setBroadcastClientSearch] = React.useState('');
  const [debouncedBroadcastClientSearch, setDebouncedBroadcastClientSearch] = React.useState('');
  const [selectedBroadcastContactIds, setSelectedBroadcastContactIds] = React.useState<number[]>([]);
  const [includeClientPhone, setIncludeClientPhone] = React.useState(true);
  const [includeClientContacts, setIncludeClientContacts] = React.useState(true);
  const [broadcastCountryId, setBroadcastCountryId] = React.useState<number | null>(null);
  const [broadcastStateId, setBroadcastStateId] = React.useState<number | null>(null);
  const [broadcastCityId, setBroadcastCityId] = React.useState<number | null>(null);
  const [broadcastMessage, setBroadcastMessage] = React.useState('');
  const [sendingBroadcast, setSendingBroadcast] = React.useState(false);
  const [markingReadConversationId, setMarkingReadConversationId] = React.useState<string | null>(null);
  const messagesContainerRef = React.useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = React.useRef<HTMLInputElement | null>(null);
  const templateHeaderMediaInputRef = React.useRef<HTMLInputElement | null>(null);
  const broadcastTemplateHeaderMediaInputRef = React.useRef<HTMLInputElement | null>(null);
  const messageInputRef = React.useRef<HTMLInputElement | null>(null);
  const emojiPickerContainerRef = React.useRef<HTMLDivElement | null>(null);

  const resolvedCompanyId = selectedCompanyId ?? userCompanyId ?? null;
  const selectedAttachmentUrl = React.useMemo(() => {
    if (!selectedAttachment) return null;
    return URL.createObjectURL(selectedAttachment);
  }, [selectedAttachment]);
  const attachmentPreviewUrl = selectedAttachment && selectedAttachment.type.startsWith('image/')
    ? selectedAttachmentUrl
    : null;

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
  const resolveTemplateHeaderFormat = (
    components?: Array<{ type?: string | null; format?: string | null }> | null,
    fallback?: string | null,
  ) => {
    const headerComponent = Array.isArray(components)
      ? components.find((component) => String(component?.type || '').toUpperCase() === 'HEADER')
      : null;

    const resolved = String(headerComponent?.format || fallback || 'NONE').toUpperCase();
    return ['TEXT', 'IMAGE', 'VIDEO', 'DOCUMENT'].includes(resolved) ? resolved : 'NONE';
  };
  const getTemplateHeaderAccept = (headerFormat: string) => {
    if (headerFormat === 'IMAGE') return 'image/jpeg,image/jpg,image/png';
    if (headerFormat === 'VIDEO') return 'video/mp4';
    if (headerFormat === 'DOCUMENT') return 'application/pdf,.pdf';
    return '';
  };
  const getTemplateHeaderLabel = (headerFormat: string) => {
    if (headerFormat === 'IMAGE') return 'Imagen';
    if (headerFormat === 'VIDEO') return 'Video';
    if (headerFormat === 'DOCUMENT') return 'Documento';
    if (headerFormat === 'TEXT') return 'Texto';
    return 'Sin header';
  };

  const { data: chatTemplatePreview } = useQuery({
    queryKey: ['whatsapp-template-preview-chat', resolvedCompanyId, chatTemplateSelection?.name, chatTemplateSelection?.language],
    queryFn: () => whatsappService.getTemplatePreview({
      company_id: resolvedCompanyId ?? undefined,
      template_name: chatTemplateSelection?.name || '',
      template_language: chatTemplateSelection?.language || 'es_CO',
    }),
    enabled: isTemplateComposerOpen && Boolean(resolvedCompanyId) && Boolean(chatTemplateSelection?.name),
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

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedBroadcastClientSearch(broadcastClientSearch.trim());
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [broadcastClientSearch]);

  const { data: clientsData, isFetching: isClientsLoading } = useQuery({
    queryKey: ['clients-for-whatsapp-broadcast', resolvedCompanyId, debouncedBroadcastClientSearch],
    queryFn: () =>
      clientService.getClients({
        company_id: resolvedCompanyId ?? undefined,
        per_page: 25,
        search: debouncedBroadcastClientSearch || undefined,
      }),
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
    if (conversations.length > 0 && !activeConversationId && !directChatTarget) {
      setActiveConversationId(conversations[0].id);
    }
    if (conversations.length === 0 && !directChatTarget) {
      setActiveConversationId(null);
    }
  }, [conversations, activeConversationId, directChatTarget]);

  const activeConversation = conversations.find((item) => item.id === activeConversationId) ?? null;
  const virtualConversation = React.useMemo<WhatsappConversation | null>(() => {
    if (!directChatTarget) return null;

    return {
      id: `draft:${directChatTarget.phone}`,
      client_id: directChatTarget.clientId ?? null,
      contact_name: directChatTarget.contactName,
      contact_phone: directChatTarget.phone,
      unread_count: 0,
      status: 'open',
      client: null,
    };
  }, [directChatTarget]);
  const chatConversation = activeConversation ?? virtualConversation;
  const hasChatTarget = Boolean(chatConversation);
  const activeClientType = activeConversation?.client?.client_type;
  const activeClientLabel = directChatTarget && !activeConversation
    ? (directChatTarget.clientId ? 'Cliente asociado · chat nuevo' : 'Contacto independiente · chat nuevo')
    : activeClientType === 'person'
      ? 'Persona'
      : activeClientType === 'company'
        ? `Empresa: ${activeConversation?.client?.name || 'Sin nombre'}`
        : 'Contacto WhatsApp';

  React.useEffect(() => {
    if (!requestedCompanyId || selectedCompanyId === requestedCompanyId) return;
    setSelectedCompanyId(requestedCompanyId);
  }, [requestedCompanyId, selectedCompanyId]);

  React.useEffect(() => {
    if (!resolvedCompanyId || requestedPhone === '') return;
    if (requestedCompanyId && resolvedCompanyId !== requestedCompanyId) return;

    setActiveTab('chat');

    const matchingConversation = conversations.find(
      (conversation) => normalizePhoneValue(conversation.contact_phone) === requestedPhone,
    );

    if (matchingConversation) {
      if (activeConversationId !== matchingConversation.id) {
        setActiveConversationId(matchingConversation.id);
      }
      if (directChatTarget) {
        setDirectChatTarget(null);
      }
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete('phone');
        next.delete('contact_name');
        next.delete('client_id');
        return next;
      }, { replace: true });
      return;
    }

    setActiveConversationId(null);
    setDirectChatTarget({
      phone: requestedPhone,
      contactName: requestedContactName || requestedPhone,
      companyId: resolvedCompanyId,
      clientId: requestedClientId,
    });
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete('phone');
      next.delete('contact_name');
      next.delete('client_id');
      return next;
    }, { replace: true });
  }, [
    activeConversationId,
    conversations,
    directChatTarget,
    requestedClientId,
    requestedCompanyId,
    requestedContactName,
    requestedPhone,
    resolvedCompanyId,
    setSearchParams,
  ]);

  React.useEffect(() => {
    if (!pendingConversationPhone) return;

    const matchingConversation = conversations.find(
      (conversation) => normalizePhoneValue(conversation.contact_phone) === pendingConversationPhone,
    );

    if (!matchingConversation) return;

    setActiveConversationId(matchingConversation.id);
    setDirectChatTarget(null);
    setPendingConversationPhone(null);
  }, [conversations, pendingConversationPhone]);

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

  React.useEffect(() => {
    return () => {
      if (selectedAttachmentUrl) {
        URL.revokeObjectURL(selectedAttachmentUrl);
      }
    };
  }, [selectedAttachmentUrl]);

  React.useEffect(() => {
    setIsEmojiPickerOpen(false);
    setSelectedAttachment(null);
    setSelectedTemplateHeaderMedia(null);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
    if (templateHeaderMediaInputRef.current) {
      templateHeaderMediaInputRef.current.value = '';
    }
  }, [activeConversationId, directChatTarget?.phone, isTemplateComposerOpen]);

  React.useEffect(() => {
    setSelectedTemplateHeaderMedia(null);
    if (templateHeaderMediaInputRef.current) {
      templateHeaderMediaInputRef.current.value = '';
    }
  }, [selectedTemplateKey]);

  React.useEffect(() => {
    setBroadcastTemplateHeaderMedia(null);
    if (broadcastTemplateHeaderMediaInputRef.current) {
      broadcastTemplateHeaderMediaInputRef.current.value = '';
    }
  }, [broadcastTemplateKey]);

  React.useEffect(() => {
    if (!isEmojiPickerOpen) return;

    const handlePointerDownOutside = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (emojiPickerContainerRef.current?.contains(target)) return;
      setIsEmojiPickerOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsEmojiPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isEmojiPickerOpen]);

  const availableTemplates = React.useMemo(() => {
    const raw = Array.isArray(metaConfig?.templates) ? metaConfig?.templates : [];
    return raw
      .filter((template) => {
        const status = String(template?.status || '').trim().toUpperCase();
        return Boolean(template?.name) && template?.is_active !== false && (status === '' || status === 'APPROVED');
      })
      .map((template) => ({
        name: String(template.name),
        language: String(template.language || 'es_CO'),
        label: String(template.label || template.name),
        body: String(template.body_text || template.body || ''),
        headerFormat: String(template.header_format || 'NONE').toUpperCase(),
        components: Array.isArray(template.components) ? template.components : [],
      }));
  }, [metaConfig?.templates]);
  const hasConfiguredTemplates = Array.isArray(metaConfig?.templates) && metaConfig.templates.length > 0;

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
    const fallbackKey = hasPreferred && preferredKey
      ? preferredKey
      : `${availableTemplates[0].name}::${availableTemplates[0].language}`;
    const hasSelectedTemplate = selectedTemplateKey
      ? availableTemplates.some((template) => `${template.name}::${template.language}` === selectedTemplateKey)
      : false;
    const hasSelectedBroadcastTemplate = broadcastTemplateKey
      ? availableTemplates.some((template) => `${template.name}::${template.language}` === broadcastTemplateKey)
      : false;

    if (!hasSelectedTemplate) {
      setSelectedTemplateKey(fallbackKey);
    }

    if (!hasSelectedBroadcastTemplate) {
      setBroadcastTemplateKey(fallbackKey);
    }
  }, [availableTemplates, metaConfig?.default_template_language, metaConfig?.default_template_name, selectedTemplateKey, broadcastTemplateKey]);

  const selectedChatTemplate = availableTemplates.find((template) => `${template.name}::${template.language}` === selectedTemplateKey) ?? null;
  const selectedBroadcastTemplate = availableTemplates.find((template) => `${template.name}::${template.language}` === broadcastTemplateKey) ?? null;
  const chatTemplateHeaderFormat = resolveTemplateHeaderFormat(chatTemplatePreview?.components, selectedChatTemplate?.headerFormat);
  const broadcastTemplateHeaderFormat = resolveTemplateHeaderFormat(
    broadcastTemplatePreview?.components,
    selectedBroadcastTemplate?.headerFormat,
  );

  React.useEffect(() => {
    setTemplateVariables((prev) => {
      const next = [...prev];
      next[0] = chatConversation?.contact_name || chatConversation?.client?.name || '';
      return next;
    });
  }, [chatConversation?.client?.name, chatConversation?.contact_name]);

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
    setSelectedBroadcastContactIds([]);
  }, [selectedBroadcastClientId]);

  const selectedCompanyName = (companiesData?.data ?? []).find((item) => item.id === resolvedCompanyId)?.name || '';
  const selectedBroadcastClient = (clientsData?.data ?? []).find((item) => item.id === selectedBroadcastClientId);
  const selectedBroadcastContact = broadcastClientContacts.find((item) => item.id === selectedBroadcastContactIds[0]);
  const selectedCountryName = countries.find((item) => item.id === broadcastCountryId)?.name || '';
  const selectedStateName = states.find((item) => item.id === broadcastStateId)?.name || '';
  const selectedCityName = cities.find((item) => item.id === broadcastCityId)?.name || '';

  React.useEffect(() => {
    const indexes = chatTemplatePreview?.variable_indexes ?? [];
    if (indexes.length === 0) return;

    setTemplateVariables((prev) =>
      indexes.map((index) => prev[index - 1] ?? (index === 1 ? (chatConversation?.contact_name || chatConversation?.client?.name || '') : ''))
    );
    setChatVariableSources((prev) => indexes.map((_, index) => prev[index] ?? 'manual'));
  }, [chatConversation?.contact_name, chatConversation?.client?.name, chatTemplatePreview?.variable_indexes]);

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
      if (source === 'contact_name') return chatConversation?.contact_name || chatConversation?.client?.name || '';
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

  const clearSelectedAttachment = React.useCallback(() => {
    setSelectedAttachment(null);
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  }, []);

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedAttachment(file);
  };

  const appendEmojiToDraft = (emoji: string) => {
    const input = messageInputRef.current;

    if (!input) {
      setMessageDraft((prev) => `${prev}${emoji}`);
      setIsEmojiPickerOpen(false);
      return;
    }

    const currentValue = input.value;
    const selectionStart = input.selectionStart ?? currentValue.length;
    const selectionEnd = input.selectionEnd ?? currentValue.length;
    const nextValue = `${currentValue.slice(0, selectionStart)}${emoji}${currentValue.slice(selectionEnd)}`;

    setMessageDraft(nextValue);
    setIsEmojiPickerOpen(false);

    window.requestAnimationFrame(() => {
      input.focus();
      const nextCaretPosition = selectionStart + emoji.length;
      input.setSelectionRange(nextCaretPosition, nextCaretPosition);
    });
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    appendEmojiToDraft(emojiData.emoji);
  };

  const templateSourceOptions = [
    { value: 'manual', label: 'Manual' },
    { value: 'contact_name', label: 'Nombre contacto' },
    { value: 'company_name', label: 'Nombre empresa' },
    { value: 'country', label: 'País' },
    { value: 'state', label: 'Estado' },
    { value: 'city', label: 'Ciudad' },
  ];

  const handleSendMessage = async (mode: 'text' | 'template') => {
    if (!resolvedCompanyId || !chatConversation) return;
    if (mode === 'text' && !messageDraft.trim() && !selectedAttachment) return;
    if (mode === 'template' && !selectedTemplateKey) return;
    if (mode === 'template' && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(chatTemplateHeaderFormat) && !selectedTemplateHeaderMedia) {
      toast.error(`La plantilla requiere un archivo de header tipo ${getTemplateHeaderLabel(chatTemplateHeaderFormat).toLowerCase()}`);
      return;
    }

    setSendingMessage(true);
    try {
      const payload: {
        company_id?: number;
        conversation_id?: string;
        to?: string;
        message?: string;
        template_name?: string;
        template_language?: string;
        template_body_text?: string;
        template_header_format?: string;
        template_header_media?: File | null;
        template_variables?: string[];
        attachment?: File | null;
      } = {
        company_id: resolvedCompanyId,
        conversation_id: activeConversation?.id,
        to: chatConversation.contact_phone || undefined,
      };

      if (mode === 'template') {
        const [templateName = '', templateLanguage = 'es_CO'] = (selectedTemplateKey || '').split('::');
        payload.template_name = templateName;
        payload.template_language = templateLanguage || 'es_CO';
        payload.template_body_text = chatTemplatePreview?.body_text || undefined;
        payload.template_header_format = chatTemplateHeaderFormat;
        payload.template_header_media = selectedTemplateHeaderMedia;
        payload.template_variables = [...templateVariables];
      } else {
        payload.message = messageDraft.trim() || undefined;
        payload.attachment = selectedAttachment;
      }

      await whatsappService.sendMessage({
        ...payload,
      });
      setMessageDraft('');
      clearSelectedAttachment();
      setIsEmojiPickerOpen(false);
      if (mode === 'template') {
        setTemplateVariables((prev) =>
          prev.map((_, index) => (index === 0 ? (chatConversation?.contact_name || chatConversation?.client?.name || '') : ''))
        );
        setSelectedTemplateHeaderMedia(null);
        if (templateHeaderMediaInputRef.current) {
          templateHeaderMediaInputRef.current.value = '';
        }
        setIsTemplateComposerOpen(false);
      }
      if (activeConversation?.id) {
        await queryClient.invalidateQueries({ queryKey: ['whatsapp-messages', resolvedCompanyId, activeConversation.id] });
      } else if (chatConversation.contact_phone) {
        setPendingConversationPhone(normalizePhoneValue(chatConversation.contact_phone));
      }
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
      template_body_text?: string;
      template_header_format?: string;
      template_header_media?: File | null;
      template_variables?: string[];
      template_variable_sources?: string[];
      recipient_client_id?: number;
      country_id?: number;
      state_id?: number;
      city_id?: number;
      include_client_contacts?: boolean;
      include_client_phone?: boolean;
      recipient_contact_ids?: number[];
    } = {
      company_id: resolvedCompanyId,
      include_client_contacts: includeClientContacts,
      include_client_phone: includeClientPhone,
    };

    if (broadcastSendMode === 'template') {
      if (!broadcastTemplateKey) {
        toast.error('Selecciona una plantilla');
        return;
      }
      if (['IMAGE', 'VIDEO', 'DOCUMENT'].includes(broadcastTemplateHeaderFormat) && !broadcastTemplateHeaderMedia) {
        toast.error(`La plantilla requiere un archivo de header tipo ${getTemplateHeaderLabel(broadcastTemplateHeaderFormat).toLowerCase()}`);
        return;
      }
      const [templateName = '', templateLanguage = 'es_CO'] = broadcastTemplateKey.split('::');
      payload.template_name = templateName;
      payload.template_language = templateLanguage || 'es_CO';
      payload.template_body_text = broadcastTemplatePreview?.body_text || undefined;
      payload.template_header_format = broadcastTemplateHeaderFormat;
      payload.template_header_media = broadcastTemplateHeaderMedia;
      payload.template_variables = [...broadcastTemplateVariables];
      payload.template_variable_sources = [...broadcastVariableSources];
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
      if (selectedBroadcastContactIds.length > 0) {
        payload.recipient_contact_ids = selectedBroadcastContactIds;
      }
      if (!includeClientPhone && !includeClientContacts) {
        toast.error('Activa teléfono principal o contactos para tener destinatarios');
        return;
      }
      if (!includeClientPhone && includeClientContacts && selectedBroadcastContactIds.length === 0 && broadcastClientContacts.length === 0) {
        toast.error('La empresa/cliente no tiene contactos para enviar');
        return;
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
      setBroadcastTemplateHeaderMedia(null);
      if (broadcastTemplateHeaderMediaInputRef.current) {
        broadcastTemplateHeaderMediaInputRef.current.value = '';
      }
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
    if (!hasChatTarget || !messageDraft.trim() || sendingMessage) return;
    void handleSendMessage('text');
  };

  const companyOptions = (companiesData?.data ?? []).map((company) => ({ value: company.id, label: company.name }));
  const clientOptions = (clientsData?.data ?? [])
    .map((client) => ({
      value: client.id,
      label: `${client.name}${client.client_type === 'company' ? ' · Empresa' : client.client_type === 'person' ? ' · Persona' : ''}${client.phone ? ` · ${client.phone}` : ''}`,
    }));
  const allBroadcastContactIds = (broadcastClientContacts ?? []).map((contact) => contact.id);
  const allContactsSelected = allBroadcastContactIds.length > 0 && allBroadcastContactIds.every((id) => selectedBroadcastContactIds.includes(id));
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
  const getMetaErrorInfo = (message: typeof messages[number]) => {
    const meta = message.meta;
    if (!meta) return { code: null as number | null, text: '' };

    const parseCode = (value: unknown): number | null => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
      return null;
    };

    const candidates = [
      {
        code: parseCode(meta.body?.error?.code),
        text: String(meta.body?.error?.error_user_msg || meta.body?.error?.message || meta.body?.error?.error_data?.details || '').trim(),
      },
      {
        code: parseCode(meta.errors?.[0]?.code),
        text: String(meta.errors?.[0]?.message || meta.errors?.[0]?.title || meta.errors?.[0]?.error_data?.details || '').trim(),
      },
      {
        code: parseCode(meta.body?.errors?.[0]?.code),
        text: String(meta.body?.errors?.[0]?.message || meta.body?.errors?.[0]?.title || meta.body?.errors?.[0]?.error_data?.details || '').trim(),
      },
      {
        code: parseCode(meta.fallback?.body?.error?.code),
        text: String(meta.fallback?.body?.error?.error_user_msg || meta.fallback?.body?.error?.message || meta.fallback?.body?.error?.error_data?.details || '').trim(),
      },
    ];

    const firstMatch = candidates.find((candidate) => candidate.code !== null || candidate.text !== '');
    return firstMatch ?? { code: null, text: '' };
  };
  const getMessageFailureReason = (message: typeof messages[number]) => {
    if (message.direction !== 'outbound' || message.status !== 'failed') return null;

    const meta = message.meta;
    const reason = String(meta?.reason || meta?.fallback?.reason || '').trim();
    const { code, text } = getMetaErrorInfo(message);
    const normalizedText = text.toLowerCase();

    if (
      code === 131047 ||
      code === 470 ||
      reason === 'missing_default_template' ||
      normalizedText.includes('outside the allowed window') ||
      normalizedText.includes('outside the customer care window') ||
      normalizedText.includes('24-hour') ||
      normalizedText.includes('24 hour') ||
      normalizedText.includes('template message')
    ) {
      return 'Fuera de la ventana de 24 horas. Debes enviar una plantilla aprobada.';
    }

    if (reason === 'missing_config') {
      return 'La configuración de WhatsApp de la compañía está incompleta.';
    }

    if (reason === 'unsupported_attachment_type') {
      return 'El tipo de archivo adjunto no es compatible con WhatsApp.';
    }

    if (reason === 'missing_default_template') {
      return 'No hay una plantilla predeterminada configurada para mensajes fuera de 24 horas.';
    }

    if (text) {
      return text;
    }

    return 'Meta rechazó el envío o la entrega del mensaje.';
  };
  const getMessageStatusLabel = (message: typeof messages[number]) => {
    if (message.direction !== 'outbound') return '';

    if (message.status === 'read') return 'Leido';
    if (message.status === 'delivered') return 'Entregado';
    if (message.status === 'failed') return 'No entregado';
    if (message.status === 'sent') return 'Aceptado por Meta';
    return String(message.status || 'En proceso');
  };
  const getMessageStatusClassName = (message: typeof messages[number]) => {
    if (message.status === 'read') return message.direction === 'outbound' ? 'text-primary-content/85' : 'text-success';
    if (message.status === 'delivered') return message.direction === 'outbound' ? 'text-primary-content/80' : 'text-info';
    if (message.status === 'failed') return 'text-error';
    return message.direction === 'outbound' ? 'text-primary-content/80' : 'text-base-content/60';
  };
  const getMessageChannelHint = (message: typeof messages[number]) => {
    if (message.direction !== 'outbound') return null;
    if (message.meta?.channel === 'template_fallback') {
      return 'Enviado con plantilla por ventana cerrada';
    }
    return null;
  };
  const getMessageAttachment = (message: typeof messages[number]) => message?.meta?.attachment ?? null;
  const getAttachmentOpenLabel = (kind?: string | null) => {
    if (kind === 'image') return 'Abrir imagen';
    if (kind === 'video') return 'Abrir video';
    if (kind === 'audio') return 'Abrir audio';
    return 'Abrir archivo';
  };
  const getAttachmentFallbackLabel = (kind?: string | null) => {
    if (kind === 'image') return 'Imagen recibida';
    if (kind === 'video') return 'Video recibido';
    if (kind === 'audio') return 'Audio recibido';
    return 'Archivo adjunto';
  };
  const shouldRenderMessageBody = (message: typeof messages[number]) => {
    const body = String(message.body || '').trim();
    if (!body) return false;

    const attachment = getMessageAttachment(message);
    const fileName = String(attachment?.file_name || '').trim();

    if (fileName !== '' && body === fileName) {
      return false;
    }

    return true;
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
  const canOpenTemplateComposer = hasChatTarget && availableTemplates.length > 0;
  const closeTemplateComposer = () => {
    if (sendingMessage) return;
    setIsTemplateComposerOpen(false);
  };

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
                            onClick={() => {
                              setDirectChatTarget(null);
                              setActiveConversationId(conversation.id);
                            }}
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
                            {chatConversation?.contact_name || chatConversation?.contact_phone || 'Selecciona un chat'}
                          </h2>
                          <p className="text-sm text-base-content/60">
                            {chatConversation?.contact_phone || 'No hay conversación activa'}
                          </p>
                          {chatConversation && (
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
                          {chatConversation ? 'No hay mensajes todavía. Puedes iniciar la conversación.' : 'No hay mensajes para mostrar.'}
                        </div>
                      ) : (
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={`max-w-[72%] rounded-2xl px-4 py-2 text-sm ${
                              message.direction === 'outbound'
                                ? message.status === 'failed'
                                  ? 'ml-auto border border-error/30 bg-error/10 text-base-content'
                                  : 'ml-auto bg-primary text-primary-content'
                                : 'bg-base-200 text-base-content'
                            }`}
                          >
                            {getMessageAttachment(message)?.kind === 'image' && getMessageAttachment(message)?.url ? (
                              <a
                                href={String(getMessageAttachment(message)?.url)}
                                target="_blank"
                                rel="noreferrer"
                                className="group block overflow-hidden rounded-xl border border-white/10 bg-black/10"
                                title="Abrir imagen"
                              >
                                <img
                                  src={String(getMessageAttachment(message)?.url)}
                                  alt={String(getMessageAttachment(message)?.file_name || 'Imagen adjunta')}
                                  className="max-h-72 w-full object-cover"
                                />
                                <div className="px-3 py-2 text-[11px] font-medium text-white/90 group-hover:underline">
                                  Abrir imagen
                                </div>
                              </a>
                            ) : null}

                            {getMessageAttachment(message)?.kind === 'video' && getMessageAttachment(message)?.url ? (
                              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/10">
                                <video
                                  controls
                                  className="max-h-72 w-full object-cover"
                                  src={String(getMessageAttachment(message)?.url)}
                                />
                                <a
                                  href={String(getMessageAttachment(message)?.url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block px-3 py-2 text-[11px] font-medium hover:underline"
                                >
                                  Abrir video
                                </a>
                              </div>
                            ) : null}

                            {getMessageAttachment(message)?.kind === 'audio' && getMessageAttachment(message)?.url ? (
                              <div className="overflow-hidden rounded-xl border border-white/10 bg-black/10 px-3 py-3">
                                <audio
                                  controls
                                  preload="metadata"
                                  className="w-full max-w-full"
                                  src={String(getMessageAttachment(message)?.url)}
                                />
                                <a
                                  href={String(getMessageAttachment(message)?.url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-2 block text-[11px] font-medium hover:underline"
                                >
                                  Abrir audio
                                </a>
                              </div>
                            ) : null}

                            {getMessageAttachment(message)?.kind === 'document' && getMessageAttachment(message)?.url ? (
                              <a
                                href={String(getMessageAttachment(message)?.url)}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                                  message.direction === 'outbound'
                                    ? message.status === 'failed'
                                      ? 'border-base-300 bg-base-100'
                                      : 'border-white/15 bg-white/10'
                                    : 'border-base-300 bg-base-100'
                                }`}
                                title="Abrir archivo"
                              >
                                <BiFile className="h-5 w-5 shrink-0" />
                                <div className="min-w-0">
                                  <div className="truncate font-medium">
                                    {getMessageAttachment(message)?.file_name || 'Archivo adjunto'}
                                  </div>
                                  <div
                                    className={`text-[11px] ${
                                      message.direction === 'outbound' && message.status !== 'failed'
                                        ? 'text-primary-content/80'
                                        : 'text-base-content/60'
                                    }`}
                                  >
                                    {getAttachmentOpenLabel(getMessageAttachment(message)?.kind)}
                                  </div>
                                </div>
                              </a>
                            ) : null}

                            {getMessageAttachment(message) && !getMessageAttachment(message)?.url ? (
                              <div
                                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
                                  message.direction === 'outbound'
                                    ? message.status === 'failed'
                                      ? 'border-base-300 bg-base-100'
                                      : 'border-white/15 bg-white/10'
                                    : 'border-base-300 bg-base-100'
                                }`}
                              >
                                <BiFile className="h-5 w-5 shrink-0" />
                                <div className="min-w-0">
                                  <div className="truncate font-medium">
                                    {getMessageAttachment(message)?.file_name || getAttachmentFallbackLabel(getMessageAttachment(message)?.kind)}
                                  </div>
                                  <div
                                    className={`text-[11px] ${
                                      message.direction === 'outbound' && message.status !== 'failed'
                                        ? 'text-primary-content/80'
                                        : 'text-base-content/60'
                                    }`}
                                  >
                                    {getMessageAttachment(message)?.mime_type || getAttachmentFallbackLabel(getMessageAttachment(message)?.kind)}
                                  </div>
                                </div>
                              </div>
                            ) : null}

                            {shouldRenderMessageBody(message) && (
                              <div className={`${getMessageAttachment(message) ? 'mt-2' : ''} whitespace-pre-wrap break-words`}>
                                {message.body}
                              </div>
                            )}

                            <div className="mt-2 space-y-1">
                              <div className={`text-[11px] ${getMessageStatusClassName(message)}`}>
                                {message.sent_at ? new Date(message.sent_at).toLocaleString() : ''}
                                {message.direction === 'outbound' ? ` · ${getMessageStatusLabel(message)}` : ''}
                              </div>

                              {getMessageChannelHint(message) && (
                                <div className={`text-[11px] ${message.direction === 'outbound' && message.status !== 'failed' ? 'text-primary-content/80' : 'text-base-content/60'}`}>
                                  {getMessageChannelHint(message)}
                                </div>
                              )}

                              {getMessageFailureReason(message) && (
                                <div className="text-[11px] text-error">
                                  {getMessageFailureReason(message)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-3 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-base-200 bg-base-50 px-3 py-2">
                        <div className="text-sm text-base-content/70">
                          Responde con texto o abre un popup para enviar una plantilla.
                        </div>
                        <button
                          type="button"
                          className="btn btn-outline btn-sm"
                          onClick={() => setIsTemplateComposerOpen(true)}
                          disabled={!canOpenTemplateComposer || sendingMessage}
                        >
                          Plantilla
                        </button>
                      </div>

                      <div className="relative space-y-2">
                        <input
                          ref={attachmentInputRef}
                          type="file"
                          className="hidden"
                          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt"
                          onChange={handleAttachmentChange}
                        />

                        {selectedAttachment && (
                          <div className="flex items-start gap-3 rounded-2xl border border-base-200 bg-base-50 p-3">
                            {attachmentPreviewUrl ? (
                              <a
                                href={attachmentPreviewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="block h-14 w-14 overflow-hidden rounded-xl"
                                title="Abrir imagen seleccionada"
                              >
                                <img
                                  src={attachmentPreviewUrl}
                                  alt={selectedAttachment.name}
                                  className="h-14 w-14 rounded-xl object-cover"
                                />
                              </a>
                            ) : (
                              <a
                                href={selectedAttachmentUrl || '#'}
                                target="_blank"
                                rel="noreferrer"
                                className="flex h-14 w-14 items-center justify-center rounded-xl border border-base-300 bg-base-100"
                                title="Abrir archivo seleccionado"
                              >
                                <BiFile className="h-6 w-6 text-base-content/60" />
                              </a>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{selectedAttachment.name}</div>
                              <div className="text-xs text-base-content/60">
                                {(selectedAttachment.size / 1024 / 1024).toFixed(2)} MB
                              </div>
                              {selectedAttachmentUrl && (
                                <a
                                  href={selectedAttachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 inline-flex text-xs font-medium text-primary hover:underline"
                                >
                                  {attachmentPreviewUrl ? 'Abrir imagen' : 'Abrir archivo'}
                                </a>
                              )}
                            </div>
                            <button type="button" className="btn btn-ghost btn-sm btn-square" onClick={clearSelectedAttachment}>
                              <BiX className="h-4 w-4" />
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="btn btn-ghost btn-square"
                            onClick={() => attachmentInputRef.current?.click()}
                            disabled={!hasChatTarget || sendingMessage}
                            title="Adjuntar archivo"
                          >
                            <BiPaperclip className="h-5 w-5" />
                          </button>
                          <div ref={emojiPickerContainerRef} className="relative">
                            {isEmojiPickerOpen && (
                              <div className="absolute bottom-full left-0 z-20 mb-2 w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-base-200 bg-base-100 shadow-xl">
                                <EmojiPicker
                                  open={isEmojiPickerOpen}
                                  onEmojiClick={handleEmojiClick}
                                  emojiStyle={EmojiStyle.NATIVE}
                                  theme={Theme.AUTO}
                                  width="100%"
                                  height={420}
                                  lazyLoadEmojis
                                  searchPlaceholder="Buscar emoji"
                                  previewConfig={{ showPreview: false }}
                                />
                              </div>
                            )}
                            <button
                              type="button"
                              className="btn btn-ghost btn-square"
                              onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                              disabled={!hasChatTarget || sendingMessage}
                              title="Agregar emoji"
                            >
                              <BiSmile className="h-5 w-5" />
                            </button>
                          </div>
                          <input
                            ref={messageInputRef}
                            className="input input-bordered w-full"
                            placeholder="Escribe un mensaje o agrega un archivo..."
                            value={messageDraft}
                            onChange={(event) => setMessageDraft(event.target.value)}
                            onKeyDown={handleComposerKeyDown}
                            disabled={!hasChatTarget || sendingMessage}
                          />
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => void handleSendMessage('text')}
                            disabled={!hasChatTarget || (!messageDraft.trim() && !selectedAttachment) || sendingMessage}
                          >
                            <BiSend className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
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
                      {availableTemplates.length === 0 && hasConfiguredTemplates && (
                        <p className="text-xs text-base-content/60">
                          No hay plantillas aprobadas disponibles todavía. Las plantillas pendientes aparecerán cuando Meta las apruebe.
                        </p>
                      )}
                      {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(broadcastTemplateHeaderFormat) && (
                        <label className="form-control w-full">
                          <span className="label-text mb-2">
                            Archivo de header ({getTemplateHeaderLabel(broadcastTemplateHeaderFormat)})
                          </span>
                          <input
                            ref={broadcastTemplateHeaderMediaInputRef}
                            type="file"
                            className="file-input file-input-bordered w-full"
                            accept={getTemplateHeaderAccept(broadcastTemplateHeaderFormat)}
                            onChange={(event) => setBroadcastTemplateHeaderMedia(event.target.files?.[0] ?? null)}
                            disabled={sendingBroadcast}
                          />
                          <span className="mt-1 text-xs text-base-content/60">
                            Esta plantilla requiere un archivo de encabezado para enviarse.
                          </span>
                          {broadcastTemplateHeaderMedia && (
                            <span className="mt-1 text-xs text-base-content/70">
                              Archivo seleccionado: {broadcastTemplateHeaderMedia.name}
                            </span>
                          )}
                        </label>
                      )}
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
                        <span className="label-text mb-2">Empresa/cliente (busca escribiendo)</span>
                        <SearchableSelect
                          options={clientOptions}
                          value={selectedBroadcastClientId}
                          onChange={(value) => {
                            setSelectedBroadcastClientId(value ? Number(value) : null);
                            setBroadcastClientSearch('');
                          }}
                          inputValue={broadcastClientSearch}
                          onInputChange={(value) => setBroadcastClientSearch(value)}
                          isLoading={isClientsLoading}
                          placeholder="Escribe nombre, correo, NIT o teléfono"
                          isClearable
                        />
                      </label>

                      {selectedBroadcastClientId && (
                        <>
                          <div className="rounded-xl border border-base-200 p-3 space-y-3">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={includeClientPhone}
                                onChange={(event) => setIncludeClientPhone(event.target.checked)}
                              />
                              <span className="text-sm">Incluir teléfono principal del cliente</span>
                            </label>

                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-sm"
                                checked={includeClientContacts}
                                onChange={(event) => setIncludeClientContacts(event.target.checked)}
                              />
                              <span className="text-sm">Incluir contactos de la empresa/cliente</span>
                            </label>

                            {includeClientContacts && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-medium">Contactos ({broadcastClientContacts.length})</span>
                                  {broadcastClientContacts.length > 0 && (
                                    <button
                                      type="button"
                                      className="btn btn-xs btn-outline"
                                      onClick={() => {
                                        if (allContactsSelected) {
                                          setSelectedBroadcastContactIds([]);
                                          return;
                                        }
                                        setSelectedBroadcastContactIds(allBroadcastContactIds);
                                      }}
                                    >
                                      {allContactsSelected ? 'Quitar todos' : 'Seleccionar todos'}
                                    </button>
                                  )}
                                </div>

                                {broadcastClientContacts.length === 0 ? (
                                  <p className="text-xs text-base-content/60">No hay contactos registrados para este cliente.</p>
                                ) : (
                                  <div className="max-h-44 overflow-auto space-y-1">
                                    {broadcastClientContacts.map((contact) => {
                                      const checked = selectedBroadcastContactIds.includes(contact.id);
                                      return (
                                        <label key={contact.id} className="flex items-center gap-2 rounded-lg border border-base-200 px-2 py-1.5">
                                          <input
                                            type="checkbox"
                                            className="checkbox checkbox-xs"
                                            checked={checked}
                                            onChange={(event) => {
                                              if (event.target.checked) {
                                                setSelectedBroadcastContactIds((prev) => [...prev, contact.id]);
                                                return;
                                              }
                                              setSelectedBroadcastContactIds((prev) => prev.filter((id) => id !== contact.id));
                                            }}
                                          />
                                          <span className="text-sm">
                                            {contact.name}
                                            {contact.phone ? ` · ${contact.phone}` : ''}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                )}
                                <p className="text-xs text-base-content/60">
                                  Si no marcas contactos, se enviará a todos los contactos del cliente.
                                </p>
                              </div>
                            )}
                          </div>
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

                  {!isClientFilterMode && (
                    <label className="flex items-center gap-2 rounded-xl border border-base-200 px-3 py-2">
                      <input
                        type="checkbox"
                        className="checkbox checkbox-sm"
                        checked={includeClientContacts}
                        onChange={(event) => setIncludeClientContacts(event.target.checked)}
                      />
                      <span className="text-sm">Incluir también teléfonos de contactos</span>
                    </label>
                  )}

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

      {isTemplateComposerOpen && (
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="text-lg font-bold">Responder con plantilla</h3>
            <p className="mt-1 text-sm text-base-content/70">
              Completa las variables y envía la plantilla sin ocupar el espacio del chat principal.
            </p>

            <div className="mt-5 space-y-4">
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
                  isDisabled={!hasChatTarget || sendingMessage || availableTemplates.length === 0}
                  isClearable={false}
                />
              </label>
              {availableTemplates.length === 0 && hasConfiguredTemplates && (
                <p className="text-xs text-base-content/60">
                  No hay plantillas aprobadas disponibles todavía. Las plantillas pendientes aparecerán cuando Meta las apruebe.
                </p>
              )}
              {['IMAGE', 'VIDEO', 'DOCUMENT'].includes(chatTemplateHeaderFormat) && (
                <label className="form-control w-full">
                  <span className="label-text mb-2">
                    Archivo de header ({getTemplateHeaderLabel(chatTemplateHeaderFormat)})
                  </span>
                  <input
                    ref={templateHeaderMediaInputRef}
                    type="file"
                    className="file-input file-input-bordered w-full"
                    accept={getTemplateHeaderAccept(chatTemplateHeaderFormat)}
                    onChange={(event) => setSelectedTemplateHeaderMedia(event.target.files?.[0] ?? null)}
                    disabled={!hasChatTarget || sendingMessage}
                  />
                  <span className="mt-1 text-xs text-base-content/60">
                    Esta plantilla requiere un archivo de encabezado para enviarse.
                  </span>
                  {selectedTemplateHeaderMedia && (
                    <span className="mt-1 text-xs text-base-content/70">
                      Archivo seleccionado: {selectedTemplateHeaderMedia.name}
                    </span>
                  )}
                </label>
              )}

              <div className="grid grid-cols-1 gap-3">
                {(chatTemplatePreview?.variable_indexes ?? []).map((variableNumber, index) => (
                  <div key={`template-modal-var-${variableNumber}`} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_220px]">
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
                        disabled={!hasChatTarget || sendingMessage}
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
                        isDisabled={!hasChatTarget || sendingMessage}
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
                <div className="whitespace-pre-wrap break-words">
                  {buildTemplatePreview(selectedTemplateKey, templateVariables, chatTemplatePreview?.body_text)}
                </div>
              </div>
            </div>

            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={closeTemplateComposer} disabled={sendingMessage}>
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleSendMessage('template')}
                disabled={!hasChatTarget || !selectedTemplateKey || sendingMessage}
              >
                <BiSend className="w-4 h-4" />
                {sendingMessage ? 'Enviando...' : 'Enviar plantilla'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={closeTemplateComposer} />
        </div>
      )}
    </div>
  );
};

export default CrmWhatsappInboxPage;
