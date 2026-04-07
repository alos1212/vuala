import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BiBuilding, BiCheckCircle, BiGroup, BiTask, BiTrendingUp } from 'react-icons/bi';
import { useAuth } from '../hooks/useAuth';
import { useAuthStore } from '../stores/authStore';
import { companyService } from '../services/companyService';
import { clientService } from '../services/clientService';
import { crmService } from '../services/crmService';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const isCompanyUser = Boolean(user?.company_id);
  const canSeeCompanies = !isCompanyUser && hasPermission('companies.list');
  const canSeeClients = hasPermission('clients.list');
  const canSeeCrm = hasPermission('crm.activities.list');

  const { data: companiesData } = useQuery({
    queryKey: ['dashboard-companies-count'],
    queryFn: () => companyService.getCompanies({ per_page: 1 }),
    enabled: canSeeCompanies,
  });

  const { data: clientsData } = useQuery({
    queryKey: ['dashboard-clients-count'],
    queryFn: () => clientService.getClients({ per_page: 1 }),
    enabled: canSeeClients,
  });

  const { data: pendingActivitiesData } = useQuery({
    queryKey: ['dashboard-pending-activities-count'],
    queryFn: () => crmService.getActivities({ per_page: 200, status: 'pending' }),
    enabled: canSeeCrm,
  });

  const companiesCount = companiesData?.meta?.total ?? 0;
  const clientsCount = clientsData?.meta?.total ?? 0;
  const pendingTasksCount = pendingActivitiesData?.meta?.total ?? pendingActivitiesData?.data?.length ?? 0;
  const totalVisibleItems = companiesCount + clientsCount + pendingTasksCount;

  const metricCards = [
    {
      title: 'Tareas pendientes',
      value: pendingTasksCount,
      icon: BiTask,
      tone: 'from-amber-400/20 to-orange-500/15 text-orange-700',
      visible: canSeeCrm,
    },
    {
      title: 'Compañías',
      value: companiesCount,
      icon: BiBuilding,
      tone: 'from-indigo-400/20 to-violet-500/15 text-indigo-700',
      visible: canSeeCompanies,
    },
    {
      title: 'Clientes',
      value: clientsCount,
      icon: BiGroup,
      tone: 'from-cyan-400/20 to-blue-500/15 text-cyan-700',
      visible: canSeeClients,
    },
  ].filter((card) => card.visible);

  const quickActions = [
    {
      title: 'Ir a compañías',
      description: 'Administra compañías y sus usuarios internos.',
      onClick: () => navigate('/companies'),
      visible: canSeeCompanies,
    },
    {
      title: 'Ir a clientes',
      description: 'Consulta y gestiona los clientes registrados.',
      onClick: () => navigate('/clients'),
      visible: canSeeClients,
    },
    {
      title: 'Ir a CRM',
      description: 'Revisa y atiende gestiones pendientes.',
      onClick: () => navigate('/crm/gestiones'),
      visible: canSeeCrm,
    },
  ].filter((action) => action.visible);

  return (
    <div className="p-6 space-y-6">
      <section className="rounded-[30px] border border-base-200 bg-gradient-to-r from-base-100 via-base-100 to-base-200/70 p-6 shadow">
        <h1 className="text-3xl font-bold text-base-content">Bienvenido, {user?.name}</h1>
        <p className="mt-2 text-base-content/70">
          Este es un resumen rápido del estado actual del sistema y de tus módulos principales.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm text-success">
          <BiCheckCircle className="h-4 w-4" />
          Sistema activo y listo para operar
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {metricCards.map((card) => (
          <article
            key={card.title}
            className={`rounded-3xl border border-base-200 bg-gradient-to-br ${card.tone} p-5 shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-base-content/70">{card.title}</div>
              <card.icon className="h-6 w-6" />
            </div>
            <div className="mt-3 text-4xl font-bold text-base-content">{card.value}</div>
            <div className="mt-2 flex items-center gap-1 text-xs text-base-content/60">
              <BiTrendingUp className="h-4 w-4" />
              Resumen actualizado
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow-sm">
        <h2 className="text-xl font-semibold">Introducción rápida</h2>
        <p className="mt-1 text-sm text-base-content/60">
          Actualmente tienes {totalVisibleItems} elementos visibles entre tareas, compañías y clientes.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          {quickActions.map((action) => (
            <button
              key={action.title}
              type="button"
              className="rounded-2xl border border-base-200 bg-base-50 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:bg-base-100 hover:shadow-md"
              onClick={action.onClick}
            >
              <div className="font-semibold">{action.title}</div>
              <div className="mt-1 text-sm text-base-content/60">{action.description}</div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export default DashboardPage;
