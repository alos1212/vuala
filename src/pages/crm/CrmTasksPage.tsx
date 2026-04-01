import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BiPencil, BiPlus, BiSearch, BiTrash } from 'react-icons/bi';
import { crmService } from '../../services/crmService';

const CrmTasksPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['crm-activities', search],
    queryFn: () => crmService.getActivities({ per_page: 100, search }),
  });

  const activities = data?.data ?? [];

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Eliminar esta gestión?')) return;
    await crmService.deleteActivity(id);
    queryClient.invalidateQueries({ queryKey: ['crm-activities'] });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-base-content">Gestiones CRM</h1>
          <p className="text-base-content/60">Listado de actividades y seguimientos por cliente.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/crm/gestiones/nueva')}>
          <BiPlus className="w-5 h-5" />
          Nueva gestión
        </button>
      </div>

      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body">
          <div className="relative">
            <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
            <input
              className="input input-bordered w-full pl-12"
              placeholder="Buscar por asunto, cliente o contacto"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center"><span className="loading loading-spinner loading-lg" /></div>
      ) : activities.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-base-300 p-10 text-center text-base-content/60">
          No hay gestiones registradas.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-base-200 bg-base-100 shadow">
          <table className="table">
            <thead>
              <tr>
                <th>Asunto</th>
                <th>Cliente</th>
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
                  <td>{activity.client?.name || `Cliente #${activity.client_id}`}</td>
                  <td>{activity.assignedUser?.name || '-'}</td>
                  <td>{new Date(activity.scheduled_start_at).toLocaleString()}</td>
                  <td>{activity.status}</td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/crm/gestiones/${activity.id}/editar`)}>
                        <BiPencil className="w-4 h-4" />
                        Editar
                      </button>
                      <button className="btn btn-outline btn-sm btn-error" onClick={() => handleDelete(activity.id)}>
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

export default CrmTasksPage;
