import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AgencyForm, { type AgencyFormValues } from '../../components/agencies/AgencyForm';
import { agencyService } from '../../services/agencyService';
import { useAgencies } from '../../hooks/useAgencies';

const AgencyEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateAgency, isUpdating } = useAgencies();

  const numericId = Number(id);
  const backPath = Number.isFinite(numericId) && numericId > 0 ? `/agencies/${numericId}` : '/agencies';
  const { data: agency, isLoading } = useQuery({
    queryKey: ['agency', numericId],
    queryFn: () => agencyService.getAgency(numericId),
    enabled: !!numericId,
  });

  const handleSubmit = (values: AgencyFormValues) => {
    const payload = {
      ...values,
      country_id: values.country_id ? Number(values.country_id) : undefined,
      state_id: values.state_id ? Number(values.state_id) : undefined,
      city_id: values.city_id ? Number(values.city_id) : undefined,
    };
    updateAgency(
      { id: numericId, data: payload },
      {
        onSuccess: (updated) => navigate(`/agencies/${updated.id}`),
      }
    );
  };

  if (isLoading || !agency) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Editar agencia</h1>
          <p className="text-base-content/60">Actualiza la información de la agencia</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate(backPath)}>
          Volver
        </button>
      </div>
      <AgencyForm title="Datos de la agencia" initialValues={agency} onSubmit={handleSubmit} isSubmitting={isUpdating} />
    </div>
  );
};

export default AgencyEditPage;
