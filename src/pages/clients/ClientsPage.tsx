import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BiGroup, BiPlus, BiRightArrowAlt, BiSearch, BiTrash } from 'react-icons/bi';
import { clientService } from '../../services/clientService';
import type { Client } from '../../types/client';

const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => clientService.getClients({ search, per_page: 100 }),
  });

  const clients = data?.data ?? [];

  const handleDelete = async (client: Client) => {
    if (!window.confirm(`¿Eliminar el cliente ${client.name}?`)) return;
    await clientService.deleteClient(client.id);
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BiGroup className="w-7 h-7 text-primary" />
            Clientes
          </h1>
          <p className="text-base-content/60">Gestiona los clientes de las compañías y sus datos de contacto.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/clients/create')}>
          <BiPlus className="w-5 h-5" />
          Nuevo cliente
        </button>
      </div>

      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body">
          <div className="relative">
            <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
            <input
              className="input input-bordered w-full pl-12"
              placeholder="Buscar cliente por nombre, NIT, correo o teléfono"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center"><span className="loading loading-spinner loading-lg" /></div>
      ) : clients.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-base-300 p-10 text-center text-base-content/60">
          No hay clientes registrados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-base-200 bg-base-100 shadow">
          <table className="table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Documento</th>
                <th>Compañía</th>
                <th>Asignado a</th>
                <th>Contacto</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="font-semibold">{client.name}</td>
                  <td>
                    <span className={`badge ${client.client_type === 'person' ? 'badge-info' : 'badge-secondary'}`}>
                      {client.client_type === 'person' ? 'Persona' : 'Empresa'}
                    </span>
                  </td>
                  <td>{client.category?.name || '-'}</td>
                  <td>{[client.document_type, client.tax_id].filter(Boolean).join(' ') || '-'}</td>
                  <td>{client.company?.name || `#${client.company_id}`}</td>
                  <td>{client.assignedUser?.name || '-'}</td>
                  <td>
                    <div className="text-sm">
                      <div>{client.email || '-'}</div>
                      <div className="text-base-content/60">{client.phone || '-'}</div>
                    </div>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/clients/${client.id}`)}>
                        <BiRightArrowAlt className="w-4 h-4" />
                        Detalle
                      </button>
                      <button className="btn btn-outline btn-sm btn-error" onClick={() => handleDelete(client)}>
                        <BiTrash className="w-4 h-4" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;
