import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BiCheckCircle, BiListUl, BiPlus, BiTimeFive, BiUser } from 'react-icons/bi';
import { crmService } from '../../services/crmService';

const CrmDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['crm-dashboard-activities'],
    queryFn: () => crmService.getActivities({ per_page: 200 }),
  });

  const activities = data?.data ?? [];
  const stats = [
    { label: 'Total gestiones', value: activities.length, icon: BiListUl },
    { label: 'Pendientes', value: activities.filter((item) => item.status === 'pending').length, icon: BiTimeFive },
    { label: 'Completadas', value: activities.filter((item) => item.status === 'completed').length, icon: BiCheckCircle },
    { label: 'Con seguimiento', value: activities.filter((item) => item.requires_follow_up).length, icon: BiUser },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-base-content">CRM</h1>
          <p className="text-base-content/60">Resumen de gestiones comerciales por cliente.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={() => navigate('/crm/gestiones')}>
            Ver gestiones
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/crm/gestiones/nueva')}>
            <BiPlus className="w-5 h-5" />
            Nueva gestión
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-base-content/60">{stat.label}</p>
                <p className="mt-2 text-3xl font-bold text-base-content">{isLoading ? '...' : stat.value}</p>
              </div>
              <stat.icon className="h-8 w-8 text-primary" />
            </div>
          </div>
        ))}
      </div>

      <section className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow">
        <h2 className="text-xl font-semibold mb-4">Últimas gestiones</h2>
        {isLoading ? (
          <div className="py-16 text-center"><span className="loading loading-spinner loading-lg" /></div>
        ) : activities.length === 0 ? (
          <div className="text-base-content/60">No hay gestiones registradas todavía.</div>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 8).map((activity) => (
              <button
                key={activity.id}
                className="w-full rounded-2xl border border-base-200 px-4 py-3 text-left hover:bg-base-200/40"
                onClick={() => navigate(`/crm/gestiones/${activity.id}/editar`)}
              >
                <div className="font-semibold">{activity.subject}</div>
                <div className="text-sm text-base-content/60">
                  {activity.client?.name || `Cliente #${activity.client_id}`} • {activity.assignedUser?.name || 'Sin responsable'}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CrmDashboardPage;
