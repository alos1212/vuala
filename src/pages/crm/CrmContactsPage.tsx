import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BiBriefcase, BiEnvelope, BiPhone, BiPlus, BiPencil, BiSearch, BiTask, BiTrash } from 'react-icons/bi';
import { FaWhatsapp } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { clientService } from '../../services/clientService';
import { companyService } from '../../services/companyService';
import { crmService } from '../../services/crmService';
import { useAuthStore } from '../../stores/authStore';
import type { Client } from '../../types/client';
import type { CrmContact, CrmContactPayload } from '../../types/crm';

type ContactStatusFilter = 'all' | 'active' | 'inactive';

interface ContactFormValues {
  company_id: number | null;
  client_id: number | null;
  name: string;
  position: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  is_active: boolean;
}

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

const resolveContactStatus = (contact: CrmContact): 'active' | 'inactive' => {
  if (contact.status === 'inactive' || contact.status === 0 || contact.status === '0') return 'inactive';
  if (contact.status === 'active' || contact.status === 1 || contact.status === '1') return 'active';
  if (contact.is_active === false) return 'inactive';
  return 'active';
};

const getDefaultFormValues = (companyId?: number | null): ContactFormValues => ({
  company_id: companyId ?? null,
  client_id: null,
  name: '',
  position: '',
  email: '',
  phone: '',
  address: '',
  notes: '',
  is_active: true,
});

const toContactFormValues = (contact: CrmContact): ContactFormValues => ({
  company_id: contact.company_id,
  client_id: contact.client_id ?? null,
  name: contact.name,
  position: contact.position ?? '',
  email: contact.email ?? '',
  phone: contact.phone ?? '',
  address: contact.address ?? '',
  notes: contact.notes ?? '',
  is_active: resolveContactStatus(contact) === 'active',
});

const formatLinkedClient = (contact: CrmContact) => {
  if (!contact.client) return 'Sin cliente asociado';
  return `${contact.client.name}${contact.client.client_type === 'person' ? ' · Persona' : ''}`;
};

const formatCompanyLabel = (contact: CrmContact) => contact.company?.name || `Compañía #${contact.company_id}`;

const CrmContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const user = useAuthStore((state) => state.user);
  const canCreateContacts = hasPermission('crm.contacts.create');
  const canReadContacts = hasPermission('crm.contacts.read');
  const canUpdateContacts = hasPermission('crm.contacts.update');
  const canDeleteContacts = hasPermission('crm.contacts.delete');
  const canOpenWhatsappInbox = hasPermission('crm.whatsapp.inbox');
  const canListCompanies = hasPermission('companies.list');
  const userCompanyId = Number(user?.company_id ?? user?.company?.id) || null;
  const isGlobalUser = !userCompanyId;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ContactStatusFilter>('all');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(userCompanyId);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingContact, setEditingContact] = useState<CrmContact | null>(null);
  const [formValues, setFormValues] = useState<ContactFormValues>(getDefaultFormValues(userCompanyId));

  const resolvedFilterCompanyId = isGlobalUser ? selectedCompanyId : userCompanyId;
  const modalCompanyId = isGlobalUser ? formValues.company_id : userCompanyId;

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, selectedCompanyId, selectedClientId]);

  useEffect(() => {
    if (!isGlobalUser) {
      setSelectedCompanyId(userCompanyId);
    }
  }, [isGlobalUser, userCompanyId]);

  useEffect(() => {
    if (!resolvedFilterCompanyId && isGlobalUser) {
      setSelectedClientId(null);
    }
  }, [resolvedFilterCompanyId, isGlobalUser]);

  const { data, isLoading } = useQuery({
    queryKey: ['crm-contacts', search, page, statusFilter, resolvedFilterCompanyId, selectedClientId],
    queryFn: () => crmService.getContacts({
      page,
      per_page: 20,
      search: search || undefined,
      company_id: resolvedFilterCompanyId ?? undefined,
      client_id: selectedClientId ?? undefined,
      is_active: statusFilter === 'all' ? undefined : statusFilter === 'active',
    }),
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companies-for-crm-contacts'],
    queryFn: () => companyService.getCompanies({ per_page: 200 }),
    enabled: isGlobalUser && canListCompanies,
  });

  const { data: filterClientsData } = useQuery({
    queryKey: ['crm-contacts-filter-clients', resolvedFilterCompanyId],
    queryFn: () => clientService.getClients({ per_page: 200, company_id: resolvedFilterCompanyId ?? undefined }),
    enabled: Boolean(resolvedFilterCompanyId),
  });

  const { data: modalClientsData } = useQuery({
    queryKey: ['crm-contacts-modal-clients', modalCompanyId],
    queryFn: () => clientService.getClients({ per_page: 200, company_id: modalCompanyId ?? undefined }),
    enabled: Boolean(modalCompanyId),
  });

  const contacts = data?.data ?? [];
  const companies = companiesData?.data ?? [];
  const filterClients = filterClientsData?.data ?? [];
  const modalClients = modalClientsData?.data ?? [];
  const totalPages = data?.meta?.last_page ?? 1;
  const currentPage = data?.meta?.current_page ?? page;

  const companyOptions = companies.map((company) => ({ value: company.id, label: company.name }));
  const filterClientOptions = filterClients.map((client) => ({ value: client.id, label: client.name }));
  const modalClientOptions = modalClients.map((client: Client) => ({ value: client.id, label: client.name }));

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingContact(null);
    setFormValues(getDefaultFormValues(isGlobalUser ? selectedCompanyId : userCompanyId));
  };

  const openCreateModal = () => {
    setEditingContact(null);
    setFormValues(getDefaultFormValues(isGlobalUser ? selectedCompanyId : userCompanyId));
    setIsModalOpen(true);
  };

  const openEditModal = (contact: CrmContact) => {
    setEditingContact(contact);
    setFormValues(toContactFormValues(contact));
    setIsModalOpen(true);
  };

  const openContactDetail = (contact: CrmContact) => {
    navigate(`/contacts/${contact.id}`);
  };

  const openWhatsappInbox = (contact: CrmContact) => {
    if (!contact.phone) return;

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

  const handleDelete = async (contact: CrmContact) => {
    if (!window.confirm(`¿Eliminar el contacto CRM ${contact.name}?`)) return;

    try {
      await crmService.deleteContact(contact.id);
      await queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      toast.success('Contacto eliminado');
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'No se pudo eliminar el contacto'));
    }
  };

  const handleSubmit = async () => {
    if (!formValues.name.trim()) {
      toast.error('El nombre del contacto es obligatorio');
      return;
    }

    if (!(isGlobalUser ? formValues.company_id : userCompanyId)) {
      toast.error('Selecciona una compañía');
      return;
    }

    const payload: CrmContactPayload = {
      company_id: isGlobalUser ? formValues.company_id : userCompanyId,
      client_id: formValues.client_id,
      name: formValues.name.trim(),
      position: formValues.position.trim(),
      email: formValues.email.trim(),
      phone: formValues.phone.trim(),
      address: formValues.address.trim(),
      notes: formValues.notes.trim(),
      is_active: formValues.is_active,
      status: formValues.is_active ? 'active' : 'inactive',
    };

    setIsSaving(true);
    try {
      if (editingContact) {
        await crmService.updateContact(editingContact.id, payload);
        toast.success('Contacto actualizado');
      } else {
        await crmService.createContact(payload);
        toast.success('Contacto creado');
      }

      await queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      closeModal();
    } catch (error: any) {
      toast.error(getApiErrorMessage(error, 'No se pudo guardar el contacto'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="app-page-header">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BiBriefcase className="w-7 h-7 text-primary" />
            Contactos
          </h1>
          <p className="text-base-content/60">Gestiona contactos de la compañía, con o sin cliente asociado, para usarlos en el CRM.</p>
        </div>
        {canCreateContacts && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <BiPlus className="w-5 h-5" />
            Nuevo contacto
          </button>
        )}
      </div>

      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body space-y-4">
          <div className="relative">
            <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
            <input
              className="input input-bordered w-full pl-12"
              placeholder="Buscar por nombre, correo, teléfono o cliente"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          <div className={`grid grid-cols-1 gap-4 ${(isGlobalUser && canListCompanies) ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {isGlobalUser && canListCompanies && (
              <label className="form-control w-full">
                <span className="label-text mb-2">Compañía</span>
                <SearchableSelect
                  options={companyOptions}
                  value={selectedCompanyId}
                  onChange={(value) => {
                    setSelectedCompanyId(value ? Number(value) : null);
                    setSelectedClientId(null);
                  }}
                  placeholder="Todas las compañías"
                  isClearable
                />
              </label>
            )}

            <label className="form-control w-full">
              <span className="label-text mb-2">Cliente asociado</span>
              <SearchableSelect
                options={filterClientOptions}
                value={selectedClientId}
                onChange={(value) => setSelectedClientId(value ? Number(value) : null)}
                placeholder={resolvedFilterCompanyId ? 'Todos los clientes' : 'Primero selecciona una compañía'}
                isDisabled={!resolvedFilterCompanyId}
                isClearable
              />
            </label>

            <label className="form-control w-full">
              <span className="label-text mb-2">Estado</span>
              <SearchableSelect
                options={[
                  { value: 'all', label: 'Todos' },
                  { value: 'active', label: 'Activos' },
                  { value: 'inactive', label: 'Inactivos' },
                ]}
                value={statusFilter}
                onChange={(value) => setStatusFilter((value as ContactStatusFilter) || 'all')}
                placeholder="Todos"
                isClearable={false}
              />
            </label>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center"><span className="loading loading-spinner loading-lg" /></div>
      ) : contacts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-base-300 p-10 text-center text-base-content/60">
          No hay contactos registrados.
        </div>
      ) : (
        <>
          <div className="space-y-3 lg:hidden">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-2xl border border-base-200 bg-base-100 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">{contact.name}</div>
                    <div className="mt-1 text-sm text-base-content/70">{contact.position || 'Sin cargo'}</div>
                  </div>
                  <span className={`badge ${resolveContactStatus(contact) === 'active' ? 'badge-success' : 'badge-ghost'}`}>
                    {resolveContactStatus(contact) === 'active' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="mt-3 grid gap-2 text-sm">
                  <div><span className="font-medium">Compañía:</span> {formatCompanyLabel(contact)}</div>
                  <div><span className="font-medium">Cliente:</span> {formatLinkedClient(contact)}</div>
                  <div><span className="font-medium">Correo:</span> {contact.email || '-'}</div>
                  <div><span className="font-medium">Teléfono:</span> {contact.phone || '-'}</div>
                  <div><span className="font-medium">Gestiones:</span> {contact.activities_count ?? 0}</div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {canReadContacts && (
                    <button className="btn btn-outline btn-sm" onClick={() => openContactDetail(contact)}>
                      Detalle
                    </button>
                  )}
                  {canOpenWhatsappInbox && contact.phone && (
                    <button className="btn btn-outline btn-sm" onClick={() => openWhatsappInbox(contact)}>
                      <FaWhatsapp className="w-4 h-4" />
                      WhatsApp
                    </button>
                  )}
                  <button className="btn btn-outline btn-sm" onClick={() => navigate(`/crm/gestiones/nueva?crm_contact_id=${contact.id}`)}>
                    <BiTask className="w-4 h-4" />
                    Nueva gestión
                  </button>
                  {canUpdateContacts && (
                    <button className="btn btn-outline btn-sm" onClick={() => openEditModal(contact)}>
                      <BiPencil className="w-4 h-4" />
                      Editar
                    </button>
                  )}
                  {canDeleteContacts && (
                    <button className="btn btn-outline btn-sm btn-error" onClick={() => handleDelete(contact)}>
                      <BiTrash className="w-4 h-4" />
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-3xl border border-base-200 bg-base-100 shadow lg:block">
            <table className="table">
              <thead>
                <tr>
                  <th>Contacto</th>
                  <th>Compañía</th>
                  <th>Cliente asociado</th>
                  <th>Canales</th>
                  <th>Gestiones</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id}>
                    <td>
                      <div className="font-semibold">{contact.name}</div>
                      <div className="text-sm text-base-content/60">{contact.position || 'Sin cargo'}</div>
                    </td>
                    <td>{formatCompanyLabel(contact)}</td>
                    <td>{formatLinkedClient(contact)}</td>
                    <td>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <BiEnvelope className="w-4 h-4 text-base-content/50" />
                          <span>{contact.email || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <BiPhone className="w-4 h-4 text-base-content/50" />
                          <span>{contact.phone || '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td>{contact.activities_count ?? 0}</td>
                    <td>
                      <span className={`badge ${resolveContactStatus(contact) === 'active' ? 'badge-success' : 'badge-ghost'}`}>
                        {resolveContactStatus(contact) === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        {canReadContacts && (
                          <button className="btn btn-outline btn-sm" onClick={() => openContactDetail(contact)}>
                            Detalle
                          </button>
                        )}
                        {canOpenWhatsappInbox && contact.phone && (
                          <button className="btn btn-outline btn-sm" onClick={() => openWhatsappInbox(contact)}>
                            <FaWhatsapp className="w-4 h-4" />
                            WhatsApp
                          </button>
                        )}
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/crm/gestiones/nueva?crm_contact_id=${contact.id}`)}>
                          <BiTask className="w-4 h-4" />
                          Gestión
                        </button>
                        {canUpdateContacts && (
                          <button className="btn btn-outline btn-sm" onClick={() => openEditModal(contact)}>
                            <BiPencil className="w-4 h-4" />
                            Editar
                          </button>
                        )}
                        {canDeleteContacts && (
                          <button className="btn btn-outline btn-sm btn-error" onClick={() => handleDelete(contact)}>
                            <BiTrash className="w-4 h-4" />
                            Eliminar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-base-200 bg-base-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-base-content/70">
                Página {currentPage} de {totalPages} · {data?.meta?.total ?? contacts.length} contactos
              </div>
              <div className="join">
                <button type="button" className="btn btn-sm join-item" disabled={currentPage <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  Anterior
                </button>
                <button type="button" className="btn btn-sm join-item" disabled={currentPage >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {isModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="modal modal-open">
          <div className="modal-box max-w-3xl">
            <h3 className="text-xl font-bold">{editingContact ? 'Editar contacto' : 'Nuevo contacto'}</h3>
            <p className="mt-1 text-sm text-base-content/60">
              El contacto siempre pertenece a una compañía y opcionalmente puede quedar asociado a un cliente.
            </p>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {isGlobalUser && canListCompanies ? (
                <label className="form-control md:col-span-2">
                  <span className="label-text mb-2">Compañía</span>
                  <SearchableSelect
                    options={companyOptions}
                    value={formValues.company_id}
                    onChange={(value) => setFormValues((current) => ({
                      ...current,
                      company_id: value ? Number(value) : null,
                      client_id: null,
                    }))}
                    placeholder="Selecciona una compañía"
                    isClearable={false}
                    isDisabled={Boolean(editingContact)}
                  />
                </label>
              ) : (
                <label className="form-control md:col-span-2">
                  <span className="label-text mb-2">Compañía</span>
                  <input
                    className="input input-bordered bg-base-200"
                    value={user?.company?.name || `Compañía #${userCompanyId ?? ''}`}
                    readOnly
                    disabled
                  />
                </label>
              )}

              <label className="form-control md:col-span-2">
                <span className="label-text mb-2">Cliente asociado</span>
                <SearchableSelect
                  options={modalClientOptions}
                  value={formValues.client_id}
                  onChange={(value) => setFormValues((current) => ({ ...current, client_id: value ? Number(value) : null }))}
                  placeholder={modalCompanyId ? 'Opcional' : 'Primero selecciona una compañía'}
                  isDisabled={!modalCompanyId}
                  isClearable
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Nombre</span>
                <input
                  className="input input-bordered"
                  value={formValues.name}
                  onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Cargo</span>
                <input
                  className="input input-bordered"
                  value={formValues.position}
                  onChange={(event) => setFormValues((current) => ({ ...current, position: event.target.value }))}
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Correo</span>
                <input
                  className="input input-bordered"
                  type="email"
                  value={formValues.email}
                  onChange={(event) => setFormValues((current) => ({ ...current, email: event.target.value }))}
                />
              </label>

              <label className="form-control">
                <span className="label-text mb-1">Teléfono</span>
                <input
                  className="input input-bordered"
                  value={formValues.phone}
                  onChange={(event) => setFormValues((current) => ({ ...current, phone: event.target.value }))}
                />
              </label>

              <label className="form-control md:col-span-2">
                <span className="label-text mb-1">Dirección</span>
                <input
                  className="input input-bordered"
                  value={formValues.address}
                  onChange={(event) => setFormValues((current) => ({ ...current, address: event.target.value }))}
                />
              </label>

              <label className="form-control md:col-span-2">
                <span className="label-text mb-1">Notas</span>
                <textarea
                  className="textarea textarea-bordered"
                  rows={4}
                  value={formValues.notes}
                  onChange={(event) => setFormValues((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>

              <label className="label cursor-pointer justify-start gap-3 md:col-span-2">
                <input
                  type="checkbox"
                  className="toggle toggle-primary"
                  checked={formValues.is_active}
                  onChange={(event) => setFormValues((current) => ({ ...current, is_active: event.target.checked }))}
                />
                <span className="label-text">Contacto activo</span>
              </label>
            </div>

            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={closeModal} disabled={isSaving}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? 'Guardando...' : editingContact ? 'Guardar cambios' : 'Crear contacto'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={closeModal} />
        </div>,
        document.body
      )}
    </div>
  );
};

export default CrmContactsPage;
