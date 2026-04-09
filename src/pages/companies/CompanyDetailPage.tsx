import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BiBuilding, BiEnvelope, BiHide, BiMap, BiPhone, BiShow, BiUser, BiUserPlus, BiPencil } from 'react-icons/bi';
import { toast } from 'react-hot-toast';
import { companyService } from '../../services/companyService';
import { clientService } from '../../services/clientService';
import { clientCategoryService } from '../../services/clientCategoryService';
import { whatsappService } from '../../services/whatsappService';
import { roleService } from '../../services/roleService';
import { geoService } from '../../services/geoService';
import { getCompanyLogo } from '../../utils/authHelpers';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { useAuthStore } from '../../stores/authStore';
import type { ClientCategory } from '../../types/clientCategory';
import type { WhatsappMetaConfig } from '../../types/whatsapp';

const getUserRoleId = (user: any): number | null => {
  if (Array.isArray(user?.role) && user.role.length > 0) {
    const roleId = Number(user.role[0]?.id);
    return Number.isFinite(roleId) ? roleId : null;
  }

  if (user?.role && typeof user.role === 'object') {
    const roleId = Number(user.role.id);
    return Number.isFinite(roleId) ? roleId : null;
  }

  const fallbackRoleId = Number(user?.role_id);
  return Number.isFinite(fallbackRoleId) ? fallbackRoleId : null;
};

const CompanyDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newUser, setNewUser] = React.useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role_id: '',
  });
  const [editingUserId, setEditingUserId] = React.useState<number | null>(null);
  const [editUser, setEditUser] = React.useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role_id: '',
  });
  const [showCreatePassword, setShowCreatePassword] = React.useState(false);
  const [showEditPassword, setShowEditPassword] = React.useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<ClientCategory | null>(null);
  const [categoryForm, setCategoryForm] = React.useState({ name: '', description: '', is_active: true });
  const [isSavingCategory, setIsSavingCategory] = React.useState(false);
  const [isSavingWhatsappConfig, setIsSavingWhatsappConfig] = React.useState(false);
  const [isCreatingWhatsappTemplate, setIsCreatingWhatsappTemplate] = React.useState(false);
  const [whatsappConfigForm, setWhatsappConfigForm] = React.useState<WhatsappMetaConfig>({
    is_configured: false,
    business_account_id: '',
    phone_number_id: '',
    access_token: '',
    verify_token: '',
    app_id: '',
    app_secret: '',
    webhook_url: '',
    default_template_name: '',
    default_template_language: 'es_CO',
    templates: [],
    is_active: true,
  });
  const [newWhatsappTemplate, setNewWhatsappTemplate] = React.useState({
    name: '',
    language: 'es_CO',
    category: 'MARKETING' as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
    body_text: '',
    example_values_text: '',
    label: '',
    is_active: true,
  });
  const [activeTab, setActiveTab] = React.useState<'general' | 'users' | 'categories' | 'whatsapp'>('general');
  const { id } = useParams<{ id: string }>();
  const companyId = Number(id);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canListCategories = hasPermission('clients.categories.list');
  const canCreateCategories = hasPermission('clients.categories.create');
  const canUpdateCategories = hasPermission('clients.categories.update');
  const canReadWhatsappConfig = hasPermission('crm.whatsapp.config.read');
  const canUpdateWhatsappConfig = hasPermission('crm.whatsapp.config.update');

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => companyService.getCompany(companyId),
    enabled: Number.isFinite(companyId),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['company-users', companyId],
    queryFn: () => companyService.getCompanyUsers(companyId),
    enabled: Number.isFinite(companyId),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['company-user-roles'],
    queryFn: roleService.getAvailableRoles,
  });

  const { data: clientsData } = useQuery({
    queryKey: ['company-clients', companyId],
    queryFn: () => clientService.getClients({ company_id: companyId, per_page: 20 }),
    enabled: Number.isFinite(companyId),
  });
  const { data: categories = [] } = useQuery({
    queryKey: ['client-categories', companyId],
    queryFn: () => clientCategoryService.getCategories(companyId),
    enabled: Number.isFinite(companyId) && canListCategories,
  });
  const { data: whatsappConfig } = useQuery({
    queryKey: ['company-whatsapp-config', companyId],
    queryFn: () => whatsappService.getMetaConfig(companyId),
    enabled: Number.isFinite(companyId) && canReadWhatsappConfig,
  });

  const clients = clientsData?.data ?? [];
  const companyRoles = roles.filter((role) => role.type === 1);
  const companyCountryId = Number(company?.country_id) || undefined;
  const companyStateId = Number(company?.state_id) || undefined;
  const companyCityId = Number(company?.city_id) || undefined;

  const { data: countries = [] } = useQuery({
    queryKey: ['geo-countries'],
    queryFn: geoService.getCountries,
  });

  const { data: states = [] } = useQuery({
    queryKey: ['geo-states', companyCountryId],
    queryFn: () => geoService.getStatesByCountry(companyCountryId as number),
    enabled: Boolean(companyCountryId),
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['geo-cities', companyStateId],
    queryFn: () => geoService.getCitiesByState(companyStateId as number),
    enabled: Boolean(companyStateId),
  });

  React.useEffect(() => {
    if (!whatsappConfig) return;
    setWhatsappConfigForm({
      is_configured: Boolean(whatsappConfig.is_configured),
      business_account_id: whatsappConfig.business_account_id || '',
      phone_number_id: whatsappConfig.phone_number_id || '',
      access_token: whatsappConfig.access_token || '',
      verify_token: whatsappConfig.verify_token || '',
      app_id: whatsappConfig.app_id || '',
      app_secret: whatsappConfig.app_secret || '',
      webhook_url: whatsappConfig.webhook_url || '',
      default_template_name: whatsappConfig.default_template_name || '',
      default_template_language: whatsappConfig.default_template_language || 'es_CO',
      templates: Array.isArray(whatsappConfig.templates) ? whatsappConfig.templates : [],
      is_active: whatsappConfig.is_active ?? true,
    });
  }, [whatsappConfig]);

  const handleCreateUser = async () => {
    if (!Number.isFinite(companyId)) return;
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim() || !newUser.role_id) return;
    await companyService.createCompanyUser(companyId, {
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      password_confirmation: newUser.password_confirmation || newUser.password,
      roles: [Number(newUser.role_id)],
      status: 'active',
    });
    queryClient.invalidateQueries({ queryKey: ['company-users', companyId] });
    setNewUser({
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
      role_id: '',
    });
    setShowCreatePassword(false);
  };

  const handleStartEditUser = (user: (typeof users)[number]) => {
    const roleId = getUserRoleId(user);

    setEditingUserId(user.id);
    setEditUser({
      name: user.name ?? '',
      email: user.email ?? '',
      password: '',
      password_confirmation: '',
      role_id: roleId ? String(roleId) : '',
    });
    setShowEditPassword(false);
  };

  const handleCancelEditUser = () => {
    setEditingUserId(null);
    setEditUser({
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
      role_id: '',
    });
    setShowEditPassword(false);
  };

  const handleUpdateUser = async () => {
    if (!Number.isFinite(companyId)) return;
    if (!editingUserId || !editUser.name.trim() || !editUser.email.trim() || !editUser.role_id) return;
    const currentUser = users.find((user) => user.id === editingUserId);

    const payload: Record<string, unknown> = {
      name: editUser.name,
      email: editUser.email,
      roles: [Number(editUser.role_id)],
      status: currentUser?.status ?? 'active',
    };

    if (editUser.password.trim()) {
      payload.password = editUser.password;
      payload.password_confirmation = editUser.password_confirmation || editUser.password;
    }

    await companyService.updateCompanyUser(companyId, editingUserId, payload);
    queryClient.invalidateQueries({ queryKey: ['company-users', companyId] });
    handleCancelEditUser();
  };

  const openCreateCategoryModal = () => {
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '', is_active: true });
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (category: ClientCategory) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name ?? '',
      description: category.description ?? '',
      is_active: category.is_active ?? true,
    });
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!Number.isFinite(companyId) || !categoryForm.name.trim() || isSavingCategory) return;

    setIsSavingCategory(true);
    try {
      if (editingCategory) {
        await clientCategoryService.updateCategory(editingCategory.id, {
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
          is_active: categoryForm.is_active,
        });
      } else {
        await clientCategoryService.createCategory({
          company_id: companyId,
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || undefined,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['client-categories', companyId] });
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      await queryClient.invalidateQueries({ queryKey: ['company-clients', companyId] });
      setIsCategoryModalOpen(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', is_active: true });
    } finally {
      setIsSavingCategory(false);
    }
  };

  const handleSaveWhatsappConfig = async () => {
    if (!Number.isFinite(companyId) || isSavingWhatsappConfig || !canUpdateWhatsappConfig) return;

    setIsSavingWhatsappConfig(true);
    try {
      await whatsappService.saveMetaConfig({
        company_id: companyId,
        ...whatsappConfigForm,
      });
      await queryClient.invalidateQueries({ queryKey: ['company-whatsapp-config', companyId] });
      toast.success('Configuración WhatsApp guardada');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'No se pudo guardar la configuración WhatsApp');
    } finally {
      setIsSavingWhatsappConfig(false);
    }
  };

  const handleAddWhatsappTemplate = () => {
    const name = newWhatsappTemplate.name.trim();
    if (!name) return;

    const language = (newWhatsappTemplate.language || 'es_CO').trim() || 'es_CO';
    const label = newWhatsappTemplate.label.trim();
    const nextTemplate = {
      name,
      language,
      label: label || null,
      is_active: Boolean(newWhatsappTemplate.is_active),
    };

    setWhatsappConfigForm((prev) => {
      const templates = Array.isArray(prev.templates) ? prev.templates : [];
      const exists = templates.some((template) => template.name === name && (template.language || 'es_CO') === language);
      if (exists) return prev;

      return {
        ...prev,
        templates: [...templates, nextTemplate],
        default_template_name: prev.default_template_name || name,
        default_template_language: prev.default_template_language || language,
      };
    });

    setNewWhatsappTemplate({
      name: '',
      language: 'es_CO',
      category: 'MARKETING',
      body_text: '',
      example_values_text: '',
      label: '',
      is_active: true,
    });
  };

  const handleCreateWhatsappTemplateInMeta = async () => {
    if (!Number.isFinite(companyId) || !canUpdateWhatsappConfig || isCreatingWhatsappTemplate) return;

    const name = newWhatsappTemplate.name.trim();
    const bodyText = newWhatsappTemplate.body_text.trim();
    if (!name || !bodyText) {
      toast.error('Nombre y contenido del body son obligatorios');
      return;
    }

    const language = (newWhatsappTemplate.language || 'es_CO').trim() || 'es_CO';
    const exampleValues = (newWhatsappTemplate.example_values_text || '')
      .split(/[\n,;]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    setIsCreatingWhatsappTemplate(true);
    try {
      const created = await whatsappService.createTemplateInMeta({
        company_id: companyId,
        name,
        language,
        category: newWhatsappTemplate.category,
        body_text: bodyText,
        label: newWhatsappTemplate.label.trim() || undefined,
        example_values: exampleValues.length > 0 ? exampleValues : undefined,
      });

      const createdTemplate = created?.template;
      const createdStatus = String(createdTemplate?.status || '').toUpperCase();
      if (createdStatus === 'REJECTED') {
        const reason = createdTemplate?.rejection_reason?.trim() || 'Meta rechazó la plantilla. Revisa el contenido e inténtalo de nuevo.';
        toast.error(reason);
        return;
      }

      if (createdTemplate?.name) {
        setWhatsappConfigForm((prev) => {
          const templates = Array.isArray(prev.templates) ? prev.templates : [];
          const exists = templates.some(
            (template) => template.name === createdTemplate.name && (template.language || 'es_CO') === (createdTemplate.language || 'es_CO')
          );
          const nextTemplates = exists
            ? templates
            : [
              ...templates,
              {
                name: createdTemplate.name,
                language: createdTemplate.language || 'es_CO',
                label: createdTemplate.label || null,
                is_active: true,
              },
            ];

          return {
            ...prev,
            templates: nextTemplates,
            default_template_name: prev.default_template_name || createdTemplate.name,
            default_template_language: prev.default_template_language || createdTemplate.language || 'es_CO',
          };
        });
      }

      await queryClient.invalidateQueries({ queryKey: ['company-whatsapp-config', companyId] });
      if (createdStatus === 'PENDING') {
        toast.success('Plantilla enviada a Meta. Estado: PENDING');
      } else {
        toast.success('Plantilla creada en Meta correctamente');
      }
      setNewWhatsappTemplate((prev) => ({
        ...prev,
        name: '',
        body_text: '',
        example_values_text: '',
        label: '',
      }));
    } catch (error: any) {
      const apiMessage = error?.response?.data?.message;
      const metaReason = error?.response?.data?.errors?.meta?.[0];
      toast.error(metaReason || apiMessage || 'No se pudo crear la plantilla en Meta');
    } finally {
      setIsCreatingWhatsappTemplate(false);
    }
  };

  const handleRemoveWhatsappTemplate = (index: number) => {
    setWhatsappConfigForm((prev) => {
      const templates = Array.isArray(prev.templates) ? prev.templates : [];
      const removed = templates[index];
      const nextTemplates = templates.filter((_, currentIndex) => currentIndex !== index);

      const wasDefault = removed &&
        removed.name === (prev.default_template_name || '') &&
        (removed.language || 'es_CO') === (prev.default_template_language || 'es_CO');

      return {
        ...prev,
        templates: nextTemplates,
        default_template_name: wasDefault ? (nextTemplates[0]?.name || '') : (prev.default_template_name || ''),
        default_template_language: wasDefault ? (nextTemplates[0]?.language || 'es_CO') : (prev.default_template_language || 'es_CO'),
      };
    });
  };

  const handleSetDefaultWhatsappTemplate = (name: string, language?: string | null) => {
    setWhatsappConfigForm((prev) => ({
      ...prev,
      default_template_name: name,
      default_template_language: (language || 'es_CO'),
    }));
  };

  const handleToggleTemplateActive = (index: number, isActive: boolean) => {
    setWhatsappConfigForm((prev) => {
      const templates = Array.isArray(prev.templates) ? prev.templates : [];
      return {
        ...prev,
        templates: templates.map((template, currentIndex) =>
          currentIndex === index ? { ...template, is_active: isActive } : template
        ),
      };
    });
  };

  if (isLoading || !company) {
    return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg" /></div>;
  }

  const companyLogo = getCompanyLogo(company);
  const isActive = company.status !== 0;
  const countryName = countries.find((country) => country.id === companyCountryId)?.name ?? '-';
  const stateName = states.find((state) => state.id === companyStateId)?.name ?? '-';
  const cityName = cities.find((city) => city.id === companyCityId)?.name ?? '-';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <section className="rounded-[32px] border border-base-200 bg-gradient-to-r from-base-100 via-base-100 to-base-200/70 p-6 shadow">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="avatar">
              <div className="w-24 h-24 rounded-[28px] border border-base-300 bg-base-100 shadow-sm">
                {companyLogo ? (
                  <img src={companyLogo} alt={`Logo de ${company.name}`} className="object-contain p-3" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-base-content/40">
                    <BiBuilding className="w-11 h-11" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="badge badge-outline mb-3">Perfil de compañía</div>
              <h1 className="text-3xl font-bold">{company.name}</h1>
              <p className="mt-1 text-base-content/60">Detalle de la compañía, sus usuarios internos y sus clientes.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`badge ${isActive ? 'badge-success' : 'badge-ghost'}`}>
                  {isActive ? 'Activa' : 'Inactiva'}
                </span>
                <span className="badge badge-outline">NIT: {company.tax_id || 'Sin registro'}</span>
              </div>
            </div>
          </div>
          <div className="app-page-header-actions">
            <button className="btn btn-ghost" onClick={() => navigate('/companies')}>Volver</button>
            <button className="btn btn-primary" onClick={() => navigate(`/companies/${company.id}/edit`)}>Editar</button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <BiUser className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-base-content/60">Usuarios internos</div>
              <div className="text-2xl font-bold">{users.length}</div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-secondary/10 p-3 text-secondary">
              <BiBuilding className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-base-content/60">Clientes visibles</div>
              <div className="text-2xl font-bold">{clients.length}</div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-accent/10 p-3 text-accent">
              <BiEnvelope className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-base-content/60">Correo principal</div>
              <div className="font-semibold truncate">{company.email || 'Sin correo'}</div>
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-base-200 bg-base-100 p-3 shadow-sm">
        <div className="tabs tabs-boxed flex-wrap gap-2 bg-transparent">
          <button type="button" className={`tab ${activeTab === 'general' ? 'tab-active' : ''}`} onClick={() => setActiveTab('general')}>
            Información
          </button>
          <button type="button" className={`tab ${activeTab === 'users' ? 'tab-active' : ''}`} onClick={() => setActiveTab('users')}>
            Usuarios
          </button>
          {(canListCategories || canCreateCategories || canUpdateCategories) && (
            <button type="button" className={`tab ${activeTab === 'categories' ? 'tab-active' : ''}`} onClick={() => setActiveTab('categories')}>
              Categorías
            </button>
          )}
          {canReadWhatsappConfig && (
            <button type="button" className={`tab ${activeTab === 'whatsapp' ? 'tab-active' : ''}`} onClick={() => setActiveTab('whatsapp')}>
              WhatsApp
            </button>
          )}
        </div>
      </section>

      {activeTab === 'general' && (
        <div className="grid grid-cols-1 gap-6">
        <section className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Información general</h2>
              <p className="text-sm text-base-content/60">Datos principales e identidad visual de la compañía.</p>
            </div>
            <div className="badge badge-outline">Resumen</div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[190px_1fr]">
            <div className="rounded-3xl border border-base-200 bg-base-50 p-4">
              <div className="text-sm text-base-content/60">Logo</div>
              <div className="mt-4 flex justify-center">
                {companyLogo ? (
                  <div className="w-28 h-28 rounded-2xl border border-base-300 bg-base-100 p-3">
                    <img src={companyLogo} alt={`Logo de ${company.name}`} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-28 h-28 rounded-2xl border border-dashed border-base-300 bg-base-100 flex items-center justify-center text-base-content/50">
                    <BiBuilding className="w-8 h-8" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                <div className="text-sm text-base-content/60">NIT</div>
                <div className="mt-1 font-semibold">{company.tax_id || '-'}</div>
              </div>
              <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                <div className="text-sm text-base-content/60">Estado</div>
                <div className="mt-1 font-semibold">{isActive ? 'Activa' : 'Inactiva'}</div>
              </div>
              <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                <div className="flex items-center gap-2 text-sm text-base-content/60">
                  <BiEnvelope className="h-4 w-4" />
                  Correo
                </div>
                <div className="mt-1 font-semibold break-all">{company.email || '-'}</div>
              </div>
              <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                <div className="flex items-center gap-2 text-sm text-base-content/60">
                  <BiPhone className="h-4 w-4" />
                  Teléfono
                </div>
                <div className="mt-1 font-semibold">{company.phone || '-'}</div>
              </div>
              <div className="rounded-2xl border border-base-200 bg-base-50 p-4 md:col-span-2">
                <div className="flex items-center gap-2 text-sm text-base-content/60">
                  <BiMap className="h-4 w-4" />
                  Dirección
                </div>
                <div className="mt-1 font-semibold">{company.address || '-'}</div>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                  <div className="text-sm text-base-content/60">País</div>
                  <div className="mt-1 font-semibold">{countryName}</div>
                </div>
                <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                  <div className="text-sm text-base-content/60">Estado</div>
                  <div className="mt-1 font-semibold">{stateName}</div>
                </div>
                <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                  <div className="text-sm text-base-content/60">Ciudad</div>
                  <div className="mt-1 font-semibold">{cityName}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
        </div>
      )}

      {activeTab === 'users' && (
        <section className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Usuarios internos</h2>
              <p className="text-sm text-base-content/60">Invita y administra el equipo de esta compañía.</p>
            </div>
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <BiUserPlus className="h-5 w-5" />
            </div>
          </div>

          <form
            className="rounded-3xl border border-base-200 bg-base-50 p-4 mb-5"
            autoComplete="off"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateUser();
            }}
          >
            <input type="text" name="fake_username" autoComplete="username" className="hidden" tabIndex={-1} />
            <input type="password" name="fake_password" autoComplete="new-password" className="hidden" tabIndex={-1} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className="input input-bordered bg-base-100"
                name="company_user_name"
                autoComplete="off"
                placeholder="Nombre"
                value={newUser.name}
                onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                className="input input-bordered bg-base-100"
                name="company_user_email"
                autoComplete="off"
                placeholder="Correo"
                value={newUser.email}
                onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
              />
              <div className="relative">
                <input
                  className="input input-bordered bg-base-100 w-full pr-12"
                  type={showCreatePassword ? 'text' : 'password'}
                  name="company_user_password"
                  autoComplete="new-password"
                  placeholder="Contraseña"
                  value={newUser.password}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm absolute right-1 top-1"
                  onClick={() => setShowCreatePassword((prev) => !prev)}
                >
                  {showCreatePassword ? <BiHide className="w-5 h-5" /> : <BiShow className="w-5 h-5" />}
                </button>
              </div>
              <SearchableSelect
                options={companyRoles.map((role) => ({ value: role.id, label: role.display_name }))}
                value={newUser.role_id ? Number(newUser.role_id) : null}
                onChange={(value) => setNewUser((prev) => ({ ...prev, role_id: value ? String(value) : '' }))}
                placeholder="Rol interno"
                isClearable
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button className="btn btn-primary" type="submit">Crear usuario</button>
            </div>
          </form>

          {users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-base-300 p-5 text-base-content/60">
              No hay usuarios internos registrados todavía para esta compañía.
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="rounded-2xl border border-base-200 bg-base-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-sm text-base-content/60">{user.email}</div>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleStartEditUser(user)}>
                      <BiPencil className="w-4 h-4" />
                      Editar
                    </button>
                  </div>

                  {editingUserId === user.id && (
                    <form
                      className="mt-4 rounded-2xl border border-base-200 bg-base-100 p-4"
                      autoComplete="off"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleUpdateUser();
                      }}
                    >
                      <input type="text" name="fake_edit_username" autoComplete="username" className="hidden" tabIndex={-1} />
                      <input type="password" name="fake_edit_password" autoComplete="new-password" className="hidden" tabIndex={-1} />
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <input
                          className="input input-bordered bg-base-100"
                          name="company_edit_user_name"
                          autoComplete="off"
                          placeholder="Nombre"
                          value={editUser.name}
                          onChange={(e) => setEditUser((prev) => ({ ...prev, name: e.target.value }))}
                        />
                        <input
                          className="input input-bordered bg-base-100"
                          name="company_edit_user_email"
                          autoComplete="off"
                          placeholder="Correo"
                          value={editUser.email}
                          onChange={(e) => setEditUser((prev) => ({ ...prev, email: e.target.value }))}
                        />
                        <div className="relative">
                          <input
                            className="input input-bordered bg-base-100 w-full pr-12"
                            type={showEditPassword ? 'text' : 'password'}
                            name="company_edit_user_password"
                            autoComplete="new-password"
                            placeholder="Nueva contraseña (opcional)"
                            value={editUser.password}
                            onChange={(e) => setEditUser((prev) => ({ ...prev, password: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm absolute right-1 top-1"
                            onClick={() => setShowEditPassword((prev) => !prev)}
                          >
                            {showEditPassword ? <BiHide className="w-5 h-5" /> : <BiShow className="w-5 h-5" />}
                          </button>
                        </div>
                        <SearchableSelect
                          options={companyRoles.map((role) => ({ value: role.id, label: role.display_name }))}
                          value={editUser.role_id ? Number(editUser.role_id) : null}
                          onChange={(value) => setEditUser((prev) => ({ ...prev, role_id: value ? String(value) : '' }))}
                          placeholder="Rol interno"
                          isClearable={false}
                        />
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <button className="btn btn-ghost btn-sm" type="button" onClick={handleCancelEditUser}>
                          Cancelar
                        </button>
                        <button className="btn btn-primary btn-sm" type="submit">
                          Guardar cambios
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {(canListCategories || canCreateCategories || canUpdateCategories) && activeTab === 'categories' && (
        <section className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold">Categorías de clientes</h2>
              <p className="text-sm text-base-content/60">
                Administra las categorías de clientes de esta compañía.
              </p>
            </div>
            {canCreateCategories && (
              <button type="button" className="btn btn-primary btn-sm" onClick={openCreateCategoryModal}>
                Nueva categoría
              </button>
            )}
          </div>

          {canListCategories ? (
            categories.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {categories.map((category) => (
                  <div key={category.id} className="rounded-2xl border border-base-200 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="font-semibold truncate">{category.name}</div>
                          <span className={`badge badge-xs ${category.is_active === false ? 'badge-ghost' : 'badge-success'}`}>
                            {category.is_active === false ? 'Inactiva' : 'Activa'}
                          </span>
                        </div>
                        <div className="text-sm text-base-content/60 mt-1">{category.description || 'Sin descripción'}</div>
                      </div>
                      {canUpdateCategories && (
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEditCategoryModal(category)}>
                          Editar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-base-content/60">No hay categorías creadas para esta compañía.</p>
            )
          ) : (
            <p className="text-base-content/60">No tienes permiso para listar categorías.</p>
          )}
        </section>
      )}

      {canReadWhatsappConfig && activeTab === 'whatsapp' && (
        <section className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Configuración WhatsApp (Meta)</h2>
            <p className="text-sm text-base-content/60">
              Define aquí las credenciales de esta compañía para habilitar el inbox de WhatsApp.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="form-control w-full">
              <span className="label-text mb-2">Business Account ID</span>
              <input
                className="input input-bordered w-full"
                value={whatsappConfigForm.business_account_id || ''}
                onChange={(event) => setWhatsappConfigForm((prev) => ({ ...prev, business_account_id: event.target.value }))}
                disabled={!canUpdateWhatsappConfig}
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-2">Phone Number ID</span>
              <input
                className="input input-bordered w-full"
                value={whatsappConfigForm.phone_number_id || ''}
                onChange={(event) => setWhatsappConfigForm((prev) => ({ ...prev, phone_number_id: event.target.value }))}
                disabled={!canUpdateWhatsappConfig}
              />
            </label>
            <label className="form-control w-full md:col-span-2">
              <span className="label-text mb-2">Access Token</span>
              <input
                className="input input-bordered w-full"
                type="password"
                value={whatsappConfigForm.access_token || ''}
                onChange={(event) => setWhatsappConfigForm((prev) => ({ ...prev, access_token: event.target.value }))}
                disabled={!canUpdateWhatsappConfig}
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-2">Verify Token</span>
              <input
                className="input input-bordered w-full"
                value={whatsappConfigForm.verify_token || ''}
                onChange={(event) => setWhatsappConfigForm((prev) => ({ ...prev, verify_token: event.target.value }))}
                disabled={!canUpdateWhatsappConfig}
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-2">App ID</span>
              <input
                className="input input-bordered w-full"
                value={whatsappConfigForm.app_id || ''}
                onChange={(event) => setWhatsappConfigForm((prev) => ({ ...prev, app_id: event.target.value }))}
                disabled={!canUpdateWhatsappConfig}
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-2">App Secret</span>
              <input
                className="input input-bordered w-full"
                type="password"
                value={whatsappConfigForm.app_secret || ''}
                onChange={(event) => setWhatsappConfigForm((prev) => ({ ...prev, app_secret: event.target.value }))}
                disabled={!canUpdateWhatsappConfig}
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-2">Webhook URL</span>
              <input
                className="input input-bordered w-full"
                value={whatsappConfigForm.webhook_url || ''}
                readOnly
                disabled
              />
            </label>
          </div>

          <div className="rounded-2xl border border-base-200 p-4 space-y-4">
            <div>
              <h3 className="text-base font-semibold">Plantillas por compañía</h3>
              <p className="text-sm text-base-content/60">
                Configura aquí las plantillas de Meta disponibles para esta compañía y marca una como predeterminada.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <label className="form-control w-full md:col-span-2">
                <span className="label-text mb-2">Nombre plantilla (Meta)</span>
                <input
                  className="input input-bordered w-full"
                  placeholder="vualacrm_primer_contacto"
                  value={newWhatsappTemplate.name}
                  onChange={(event) => setNewWhatsappTemplate((prev) => ({ ...prev, name: event.target.value }))}
                  disabled={!canUpdateWhatsappConfig}
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-2">Idioma</span>
                <input
                  className="input input-bordered w-full"
                  placeholder="es_CO"
                  value={newWhatsappTemplate.language}
                  onChange={(event) => setNewWhatsappTemplate((prev) => ({ ...prev, language: event.target.value }))}
                  disabled={!canUpdateWhatsappConfig}
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-2">Categoría Meta</span>
                <SearchableSelect
                  options={[
                    { value: 'MARKETING', label: 'MARKETING' },
                    { value: 'UTILITY', label: 'UTILITY' },
                    { value: 'AUTHENTICATION', label: 'AUTHENTICATION' },
                  ]}
                  value={newWhatsappTemplate.category}
                  onChange={(value) => setNewWhatsappTemplate((prev) => ({ ...prev, category: String(value || 'MARKETING') as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION' }))}
                  isClearable={false}
                  isDisabled={!canUpdateWhatsappConfig}
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-2">Etiqueta opcional</span>
                <input
                  className="input input-bordered w-full"
                  placeholder="Primer contacto"
                  value={newWhatsappTemplate.label}
                  onChange={(event) => setNewWhatsappTemplate((prev) => ({ ...prev, label: event.target.value }))}
                  disabled={!canUpdateWhatsappConfig}
                />
              </label>
              <label className="form-control w-full md:col-span-4">
                <span className="label-text mb-2">Body de plantilla (Meta)</span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={4}
                  placeholder={'Hola {{1}}, te damos la bienvenida a VualaCRM'}
                  value={newWhatsappTemplate.body_text}
                  onChange={(event) => setNewWhatsappTemplate((prev) => ({ ...prev, body_text: event.target.value }))}
                  disabled={!canUpdateWhatsappConfig}
                />
                <span className="mt-1 text-xs text-base-content/60">
                  Usa variables como {`{{1}}`} o {`{{2}}`} si la plantilla las necesita.
                </span>
              </label>
              <label className="form-control w-full md:col-span-4">
                <span className="label-text mb-2">Ejemplos para variables (opcional)</span>
                <input
                  className="input input-bordered w-full"
                  placeholder="Carlos, Bogotá (separado por coma)"
                  value={newWhatsappTemplate.example_values_text}
                  onChange={(event) => setNewWhatsappTemplate((prev) => ({ ...prev, example_values_text: event.target.value }))}
                  disabled={!canUpdateWhatsappConfig}
                />
                <span className="mt-1 text-xs text-base-content/60">
                  Si el body tiene variables, agrega ejemplos en orden para que Meta valide.
                </span>
              </label>
            </div>

            {canUpdateWhatsappConfig && (
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn btn-outline btn-sm" onClick={handleAddWhatsappTemplate}>
                  Agregar local
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleCreateWhatsappTemplateInMeta}
                  disabled={isCreatingWhatsappTemplate}
                >
                  {isCreatingWhatsappTemplate ? 'Creando en Meta...' : 'Crear en Meta'}
                </button>
              </div>
            )}

            {Array.isArray(whatsappConfigForm.templates) && whatsappConfigForm.templates.length > 0 ? (
              <div className="space-y-2">
                {whatsappConfigForm.templates.map((template, index) => {
                  const isDefault =
                    template.name === (whatsappConfigForm.default_template_name || '') &&
                    (template.language || 'es_CO') === (whatsappConfigForm.default_template_language || 'es_CO');

                  return (
                    <div key={`${template.name}-${template.language || 'es_CO'}-${index}`} className="rounded-xl border border-base-200 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold">{template.label || template.name}</div>
                          <div className="text-xs text-base-content/60">
                            {template.name} · {(template.language || 'es_CO')}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`badge ${isDefault ? 'badge-primary' : 'badge-ghost'}`}>
                            {isDefault ? 'Predeterminada' : 'Disponible'}
                          </span>
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              className="checkbox checkbox-xs"
                              checked={template.is_active !== false}
                              onChange={(event) => handleToggleTemplateActive(index, event.target.checked)}
                              disabled={!canUpdateWhatsappConfig}
                            />
                            Activa
                          </label>
                          {canUpdateWhatsappConfig && !isDefault && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs"
                              onClick={() => handleSetDefaultWhatsappTemplate(template.name, template.language)}
                            >
                              Marcar predeterminada
                            </button>
                          )}
                          {canUpdateWhatsappConfig && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-xs text-error"
                              onClick={() => handleRemoveWhatsappTemplate(index)}
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-base-content/60">
                No hay plantillas configuradas todavía para esta compañía.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 rounded-xl border border-base-300 px-3 py-2">
              <input
                type="checkbox"
                className="checkbox checkbox-primary checkbox-sm"
                checked={Boolean(whatsappConfigForm.is_configured)}
                onChange={(event) => setWhatsappConfigForm((prev) => ({ ...prev, is_configured: event.target.checked }))}
                disabled={!canUpdateWhatsappConfig}
              />
              <span className="text-sm">Configuración completada</span>
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-base-300 px-3 py-2">
              <input
                type="checkbox"
                className="checkbox checkbox-primary checkbox-sm"
                checked={Boolean(whatsappConfigForm.is_active)}
                onChange={(event) => setWhatsappConfigForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                disabled={!canUpdateWhatsappConfig}
              />
              <span className="text-sm">Integración activa</span>
            </label>

            {canUpdateWhatsappConfig && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveWhatsappConfig}
                disabled={isSavingWhatsappConfig}
              >
                {isSavingWhatsappConfig ? 'Guardando...' : 'Guardar WhatsApp'}
              </button>
            )}
          </div>
        </section>
      )}

      {isCategoryModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="text-lg font-bold">{editingCategory ? 'Editar categoría' : 'Nueva categoría'}</h3>
            <p className="text-sm text-base-content/60 mt-1">
              {editingCategory ? 'Actualiza los datos de la categoría.' : 'Crea una categoría para esta compañía.'}
            </p>

            <div className="mt-4 space-y-3">
              <label className="form-control w-full">
                <span className="label-text mb-2">Nombre</span>
                <input
                  className="input input-bordered w-full"
                  value={categoryForm.name}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, name: event.target.value }))}
                  disabled={isSavingCategory}
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text mb-2">Descripción</span>
                <textarea
                  className="textarea textarea-bordered w-full"
                  rows={3}
                  value={categoryForm.description}
                  onChange={(event) => setCategoryForm((prev) => ({ ...prev, description: event.target.value }))}
                  disabled={isSavingCategory}
                />
              </label>
              {editingCategory && (
                <label className="flex items-center gap-2 rounded-xl border border-base-300 px-3 py-2">
                  <input
                    type="checkbox"
                    className="checkbox checkbox-primary checkbox-sm"
                    checked={categoryForm.is_active}
                    onChange={(event) => setCategoryForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                    disabled={isSavingCategory}
                  />
                  <span className="text-sm">Categoría activa</span>
                </label>
              )}
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setIsCategoryModalOpen(false);
                  setEditingCategory(null);
                }}
                disabled={isSavingCategory}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveCategory}
                disabled={!categoryForm.name.trim() || isSavingCategory}
              >
                {isSavingCategory ? 'Guardando...' : editingCategory ? 'Guardar cambios' : 'Crear categoría'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !isSavingCategory && setIsCategoryModalOpen(false)} />
        </div>
      )}
    </div>
  );
};

export default CompanyDetailPage;
