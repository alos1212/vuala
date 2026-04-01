import React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import { clientService } from '../../services/clientService';
import { companyService } from '../../services/companyService';
import { geoService } from '../../services/geoService';
import type { Client } from '../../types/client';
import SearchableSelect from '../../components/ui/SearchableSelect';

const ClientFormPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const [newContact, setNewContact] = React.useState({
    name: '',
    position: '',
    email: '',
    phone: '',
    is_primary: false,
  });
  const [pendingContacts, setPendingContacts] = React.useState<Array<{
    name: string;
    position?: string;
    email?: string;
    phone?: string;
    is_primary?: boolean;
  }>>([]);

  const { data: companiesData } = useQuery({
    queryKey: ['companies-for-clients'],
    queryFn: () => companyService.getCompanies({ per_page: 200 }),
  });
  const companies = companiesData?.data ?? [];

  const { data: client } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientService.getClient(Number(id)),
    enabled: isEdit,
  });

  const { register, control, handleSubmit, reset, setValue, watch } = useForm<Partial<Client>>({
    values: client ?? {
      company_id: searchParams.get('company_id') ? Number(searchParams.get('company_id')) : undefined,
      name: '',
      tax_id: '',
      email: '',
      phone: '',
      address: '',
      country_id: undefined,
      state_id: undefined,
      city_id: undefined,
      notes: '',
      status: 1,
    },
  });

  const selectedCountryId = Number(watch('country_id')) || undefined;
  const selectedStateId = Number(watch('state_id')) || undefined;
  const selectedCityId = Number(watch('city_id')) || undefined;

  const { data: countries = [] } = useQuery({
    queryKey: ['geo-countries'],
    queryFn: geoService.getCountries,
  });

  const { data: states = [], isFetched: isStatesFetched } = useQuery({
    queryKey: ['geo-states', selectedCountryId],
    queryFn: () => geoService.getStatesByCountry(selectedCountryId as number),
    enabled: Boolean(selectedCountryId),
  });

  const { data: cities = [], isFetched: isCitiesFetched } = useQuery({
    queryKey: ['geo-cities', selectedStateId],
    queryFn: () => geoService.getCitiesByState(selectedStateId as number),
    enabled: Boolean(selectedStateId),
  });

  React.useEffect(() => {
    if (client) reset(client);
  }, [client, reset]);

  React.useEffect(() => {
    if (!selectedCountryId) {
      setValue('state_id', undefined);
      setValue('city_id', undefined);
      return;
    }
    if (isStatesFetched && selectedStateId && !states.some((state) => state.id === selectedStateId)) {
      setValue('state_id', undefined);
      setValue('city_id', undefined);
    }
  }, [isStatesFetched, selectedCountryId, selectedStateId, setValue, states]);

  React.useEffect(() => {
    if (!selectedStateId) {
      setValue('city_id', undefined);
      return;
    }
    if (isCitiesFetched && selectedCityId && !cities.some((city) => city.id === selectedCityId)) {
      setValue('city_id', undefined);
    }
  }, [cities, isCitiesFetched, selectedCityId, selectedStateId, setValue]);

  const onSubmit = async (values: Partial<Client>) => {
    const normalizeGeoId = (value: unknown): number | undefined => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
    };

    const payload = {
      ...values,
      company_id: values.company_id ? Number(values.company_id) : undefined,
      country_id: normalizeGeoId(values.country_id),
      state_id: normalizeGeoId(values.state_id),
      city_id: normalizeGeoId(values.city_id),
      status: values.status ? 1 : 0,
    };

    if (isEdit && id) {
      await clientService.updateClient(Number(id), payload);
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      navigate(`/clients/${id}`);
      return;
    }

    const created = await clientService.createClient(payload);

    if (pendingContacts.length > 0) {
      for (const contact of pendingContacts) {
        await clientService.createContact(created.id, contact);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['clients'] });
    navigate(`/clients/${created.id}`);
  };

  const addPendingContact = () => {
    if (!newContact.name.trim()) return;

    const contactToAdd = {
      name: newContact.name.trim(),
      position: newContact.position.trim() || undefined,
      email: newContact.email.trim() || undefined,
      phone: newContact.phone.trim() || undefined,
      is_primary: newContact.is_primary,
    };

    setPendingContacts((prev) => {
      if (!contactToAdd.is_primary) return [...prev, contactToAdd];
      return [
        ...prev.map((contact) => ({ ...contact, is_primary: false })),
        contactToAdd,
      ];
    });

    setNewContact({
      name: '',
      position: '',
      email: '',
      phone: '',
      is_primary: false,
    });
  };

  const removePendingContact = (index: number) => {
    setPendingContacts((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? 'Editar cliente' : 'Crear cliente'}</h1>
          <p className="text-base-content/60">Registra clientes y asígnalos a la compañía correspondiente.</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate(isEdit && id ? `/clients/${id}` : '/clients')}>
          Volver
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="form-control w-full">
            <span className="label-text mb-2">Compañía</span>
            <Controller
              control={control}
              name="company_id"
              render={({ field }) => (
                <SearchableSelect
                  options={companies.map((company) => ({ value: company.id, label: company.name }))}
                  value={field.value ?? null}
                  onChange={(value) => field.onChange(value ?? undefined)}
                  placeholder="Selecciona una compañía"
                  isClearable
                />
              )}
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-2">Nombre</span>
            <input className="input input-bordered w-full" {...register('name', { required: true })} />
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-2">NIT</span>
            <input className="input input-bordered w-full" {...register('tax_id')} />
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-2">Correo</span>
            <input className="input input-bordered w-full" type="email" {...register('email')} />
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-2">Teléfono</span>
            <input className="input input-bordered w-full" {...register('phone')} />
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-2">País</span>
            <Controller
              control={control}
              name="country_id"
              render={({ field }) => (
                <SearchableSelect
                  options={countries.map((country) => ({ value: country.id, label: country.name }))}
                  value={field.value ?? null}
                  onChange={(value) => field.onChange(value ?? undefined)}
                  placeholder="Selecciona un país"
                  isClearable
                />
              )}
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-2">Estado</span>
            <Controller
              control={control}
              name="state_id"
              render={({ field }) => (
                <SearchableSelect
                  options={states.map((state) => ({ value: state.id, label: state.name }))}
                  value={field.value ?? null}
                  onChange={(value) => field.onChange(value ?? undefined)}
                  placeholder={selectedCountryId ? 'Selecciona un estado' : 'Primero selecciona un país'}
                  isDisabled={!selectedCountryId}
                  isClearable
                />
              )}
            />
          </label>
          <label className="form-control w-full">
            <span className="label-text mb-2">Ciudad</span>
            <Controller
              control={control}
              name="city_id"
              render={({ field }) => (
                <SearchableSelect
                  options={cities.map((city) => ({ value: city.id, label: city.name }))}
                  value={field.value ?? null}
                  onChange={(value) => field.onChange(value ?? undefined)}
                  placeholder={selectedStateId ? 'Selecciona una ciudad' : 'Primero selecciona un estado'}
                  isDisabled={!selectedStateId}
                  isClearable
                />
              )}
            />
          </label>
          <label className="form-control w-full md:col-span-2">
            <span className="label-text mb-2">Dirección</span>
            <input className="input input-bordered w-full" {...register('address')} />
          </label>
          <label className="form-control w-full md:col-span-2">
            <span className="label-text mb-2">Notas</span>
            <textarea className="textarea textarea-bordered w-full" rows={4} {...register('notes')} />
          </label>
        </div>

        {!isEdit && (
          <div className="mt-6 rounded-2xl border border-base-200 bg-base-50 p-4">
            <div className="mb-3">
              <h3 className="text-lg font-semibold">Contactos iniciales</h3>
              <p className="text-sm text-base-content/60">Puedes crear contactos del cliente en este mismo paso.</p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              <input
                className="input input-bordered w-full bg-base-100"
                placeholder="Nombre del contacto"
                value={newContact.name}
                onChange={(e) => setNewContact((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                className="input input-bordered w-full bg-base-100"
                placeholder="Cargo"
                value={newContact.position}
                onChange={(e) => setNewContact((prev) => ({ ...prev, position: e.target.value }))}
              />
              <input
                className="input input-bordered w-full bg-base-100"
                placeholder="Correo"
                type="email"
                value={newContact.email}
                onChange={(e) => setNewContact((prev) => ({ ...prev, email: e.target.value }))}
              />
              <input
                className="input input-bordered w-full bg-base-100"
                placeholder="Teléfono"
                value={newContact.phone}
                onChange={(e) => setNewContact((prev) => ({ ...prev, phone: e.target.value }))}
              />
              <label className="flex items-center gap-2 rounded-xl border border-base-300 bg-base-100 px-3">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={newContact.is_primary}
                  onChange={(e) => setNewContact((prev) => ({ ...prev, is_primary: e.target.checked }))}
                />
                <span className="text-sm">Principal</span>
              </label>
            </div>

            <div className="mt-3 flex justify-end">
              <button className="btn btn-outline btn-sm" type="button" onClick={addPendingContact}>
                Agregar contacto
              </button>
            </div>

            {pendingContacts.length > 0 && (
              <div className="mt-3 space-y-2">
                {pendingContacts.map((contact, index) => (
                  <div key={`${contact.name}-${index}`} className="flex items-center justify-between rounded-xl border border-base-200 bg-base-100 px-3 py-2">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {contact.name}
                        {contact.is_primary ? <span className="ml-2 badge badge-primary badge-sm">Principal</span> : null}
                      </div>
                      <div className="text-sm text-base-content/60 truncate">
                        {[contact.position, contact.email, contact.phone].filter(Boolean).join(' · ') || 'Sin datos adicionales'}
                      </div>
                    </div>
                    <button className="btn btn-ghost btn-sm text-error" type="button" onClick={() => removePendingContact(index)}>
                      Quitar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button className="btn btn-primary" type="submit">
            {isEdit ? 'Guardar cambios' : 'Crear cliente'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ClientFormPage;
