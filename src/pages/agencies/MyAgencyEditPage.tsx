import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AgencyForm, { type AgencyFormValues } from '../../components/agencies/AgencyForm';
import { agencyService } from '../../services/agencyService';
import { toast } from 'react-hot-toast';

const MyAgencyEditPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: agency, isLoading } = useQuery({
    queryKey: ['my-agency'],
    queryFn: agencyService.getMyAgency,
  });

  const updateMutation = useMutation({
    mutationFn: agencyService.updateMyAgency,
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['my-agency'] });
      queryClient.invalidateQueries({ queryKey: ['my-agency-users'] });
      queryClient.invalidateQueries({ queryKey: ['agency', updated.id] });
      queryClient.invalidateQueries({ queryKey: ['agency-users', updated.id] });
      toast.success('Agencia actualizada correctamente');
      navigate('/my-agency');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.message || 'No se pudo actualizar la agencia';
      toast.error(message);
    },
  });

  const handleSubmit = (values: AgencyFormValues) => {
    const payload = {
      ...values,
      country_id: values.country_id ? Number(values.country_id) : undefined,
      state_id: values.state_id ? Number(values.state_id) : undefined,
      city_id: values.city_id ? Number(values.city_id) : undefined,
    };

    updateMutation.mutate(payload);
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
          <h1 className="text-3xl font-bold">Editar mi agencia</h1>
          <p className="text-base-content/60">Actualiza la información de tu agencia</p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/my-agency')}>
          Volver
        </button>
      </div>
      <AgencyForm
        title="Datos de la agencia"
        initialValues={agency}
        onSubmit={handleSubmit}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
};

export default MyAgencyEditPage;
