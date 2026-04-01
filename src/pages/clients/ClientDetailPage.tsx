import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clientService } from '../../services/clientService';
import { geoService } from '../../services/geoService';

const ClientDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const clientId = Number(id);
  const [contactForm, setContactForm] = useState({ name: '', position: '', email: '', phone: '', is_primary: false });

  const { data: client, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientService.getClient(clientId),
    enabled: Number.isFinite(clientId),
  });

  const clientCountryId = Number(client?.country_id) || undefined;
  const clientStateId = Number(client?.state_id) || undefined;
  const clientCityId = Number(client?.city_id) || undefined;

  const { data: countries = [] } = useQuery({
    queryKey: ['geo-countries'],
    queryFn: geoService.getCountries,
  });

  const { data: states = [] } = useQuery({
    queryKey: ['geo-states', clientCountryId],
    queryFn: () => geoService.getStatesByCountry(clientCountryId as number),
    enabled: Boolean(clientCountryId),
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['geo-cities', clientStateId],
    queryFn: () => geoService.getCitiesByState(clientStateId as number),
    enabled: Boolean(clientStateId),
  });

  const handleCreateContact = async () => {
    if (!contactForm.name.trim()) return;
    await clientService.createContact(clientId, contactForm);
    setContactForm({ name: '', position: '', email: '', phone: '', is_primary: false });
    queryClient.invalidateQueries({ queryKey: ['client', clientId] });
  };

  const handleDeleteContact = async (contactId: number) => {
    if (!window.confirm('¿Eliminar este contacto?')) return;
    await clientService.deleteContact(clientId, contactId);
    queryClient.invalidateQueries({ queryKey: ['client', clientId] });
  };

  if (isLoading || !client) {
    return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg" /></div>;
  }

  const countryName = countries.find((country) => country.id === clientCountryId)?.name ?? '-';
  const stateName = states.find((state) => state.id === clientStateId)?.name ?? '-';
  const cityName = cities.find((city) => city.id === clientCityId)?.name ?? '-';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{client.name}</h1>
          <p className="text-base-content/60">Detalle del cliente, sus contactos y datos comerciales.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost" onClick={() => navigate('/clients')}>Volver</button>
          <button className="btn btn-primary" onClick={() => navigate(`/clients/${client.id}/edit`)}>Editar</button>
        </div>
      </div>

      <section className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow">
        <h2 className="text-xl font-semibold mb-4">Información general</h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div><div className="text-sm text-base-content/60">Compañía</div><div className="font-semibold">{client.company?.name || `#${client.company_id}`}</div></div>
          <div><div className="text-sm text-base-content/60">NIT</div><div className="font-semibold">{client.tax_id || '-'}</div></div>
          <div><div className="text-sm text-base-content/60">Correo</div><div className="font-semibold">{client.email || '-'}</div></div>
          <div><div className="text-sm text-base-content/60">Teléfono</div><div className="font-semibold">{client.phone || '-'}</div></div>
          <div><div className="text-sm text-base-content/60">País</div><div className="font-semibold">{countryName}</div></div>
          <div><div className="text-sm text-base-content/60">Estado</div><div className="font-semibold">{stateName}</div></div>
          <div><div className="text-sm text-base-content/60">Ciudad</div><div className="font-semibold">{cityName}</div></div>
          <div className="md:col-span-2"><div className="text-sm text-base-content/60">Dirección</div><div className="font-semibold">{client.address || '-'}</div></div>
          <div className="md:col-span-2"><div className="text-sm text-base-content/60">Notas</div><div className="font-semibold whitespace-pre-wrap">{client.notes || '-'}</div></div>
        </div>
      </section>

      <section className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Contactos del cliente</h2>
          <p className="text-sm text-base-content/60">Estos contactos no tienen acceso al sistema.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <input className="input input-bordered" placeholder="Nombre" value={contactForm.name} onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))} />
          <input className="input input-bordered" placeholder="Cargo" value={contactForm.position} onChange={(e) => setContactForm((prev) => ({ ...prev, position: e.target.value }))} />
          <input className="input input-bordered" placeholder="Correo" value={contactForm.email} onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))} />
          <input className="input input-bordered" placeholder="Teléfono" value={contactForm.phone} onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))} />
          <button className="btn btn-primary" onClick={handleCreateContact}>Agregar contacto</button>
        </div>

        {client.contacts && client.contacts.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {client.contacts.map((contact) => (
              <div key={contact.id} className="rounded-2xl border border-base-200 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-semibold">{contact.name}</div>
                    <div className="text-sm text-base-content/60">{contact.position || 'Sin cargo'}</div>
                    <div className="text-sm">{contact.email || '-'}</div>
                    <div className="text-sm text-base-content/60">{contact.phone || '-'}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm text-error" onClick={() => handleDeleteContact(contact.id)}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-base-content/60">Este cliente todavía no tiene contactos registrados.</p>
        )}
      </section>
    </div>
  );
};

export default ClientDetailPage;
