import React from 'react';
import { useNavigate } from 'react-router-dom';
import AgencyForm, { type AgencyFormValues } from '../../components/agencies/AgencyForm';
import { useAgencies } from '../../hooks/useAgencies';

const AgencyCreatePage: React.FC = () => {
  const { createAgency, isCreating } = useAgencies();
  const navigate = useNavigate();

  const handleSubmit = (values: AgencyFormValues) => {
    const payload = {
      ...values,
      country_id: values.country_id ? Number(values.country_id) : undefined,
      state_id: values.state_id ? Number(values.state_id) : undefined,
      city_id: values.city_id ? Number(values.city_id) : undefined,
    };
    createAgency(payload, {
      onSuccess: (agency) => navigate(`/agencies/${agency.id}`),
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Crear agencia</h1>
          <p className="text-base-content/60">Completa los datos para crear una nueva agencia</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/agencies')}>
          Volver
        </button>
      </div>
      <AgencyForm
        title="Datos de la agencia"
        onSubmit={handleSubmit}
        isSubmitting={isCreating}
      />
    </div>
  );
};

export default AgencyCreatePage;
