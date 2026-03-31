// src/hooks/useAgencies.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { agencyService } from '../services/agencyService';
import { toast } from 'react-hot-toast';
import type { Agency } from '../types/agency';

export const useAgencies = () => {
  const queryClient = useQueryClient();

  const agenciesQuery = useQuery({
    queryKey: ['agencies'],
    queryFn: agencyService.getAgencies,
  });

  const createAgencyMutation = useMutation({
    mutationFn: agencyService.createAgency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      toast.success('Agencia creada correctamente');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo crear la agencia');
    },
  });

  const updateAgencyMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Agency> }) =>
      agencyService.updateAgency(id, data),
    onSuccess: (agency) => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      queryClient.invalidateQueries({ queryKey: ['agency', agency.id] });
      toast.success('Agencia actualizada');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo actualizar la agencia');
    },
  });

  const deleteAgencyMutation = useMutation({
    mutationFn: agencyService.deleteAgency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      toast.success('Agencia eliminada');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo eliminar la agencia');
    },
  });

  return {
    agencies: agenciesQuery.data || [],
    isLoading: agenciesQuery.isLoading,
    isFetching: agenciesQuery.isFetching,
    createAgency: createAgencyMutation.mutate,
    updateAgency: updateAgencyMutation.mutate,
    deleteAgency: deleteAgencyMutation.mutate,
    isCreating: createAgencyMutation.isPending,
    isUpdating: updateAgencyMutation.isPending,
    isDeleting: deleteAgencyMutation.isPending,
  };
};
