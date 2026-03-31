import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BiArrowBack, BiCheck, BiLayer } from 'react-icons/bi';
import { insurancePlanService } from '../../services/insurancePlanService';
import { agencyService } from '../../services/agencyService';
import type { InsurancePlan } from '../../types/insurancePlan';
import { toast } from 'react-hot-toast';

type CommissionType = 'included' | 'not_included';

interface PlanAgency {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  assigned?: boolean;
  commission_type?: CommissionType | null;
  commission_value?: number | string | null;
  commission_default?: number | string | null;
  additional_value_id?: number | null;
}

const InsurancePlanAgenciesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const planId = Number(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState<
    Record<number, { commission_type: CommissionType; commission_value: string; active: boolean; additional_value_id: string }>
  >({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'selected' | 'unselected'>('all');

  const { data: plan } = useQuery<InsurancePlan>({
    queryKey: ['insurance-plan', planId],
    queryFn: () => insurancePlanService.getInsurancePlan(planId),
    enabled: !!planId,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: agencies, isLoading } = useQuery<PlanAgency[]>({
    queryKey: ['plan-agencies', planId],
    queryFn: () => insurancePlanService.getInsurancePlanAgencies(planId),
    enabled: !!planId,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (!agencies) return;
    const defaultAdditionalValueId =
      plan?.additional_values?.find((val) => val.is_default && val.active)?.id ?? null;
    const next: Record<number, { commission_type: CommissionType; commission_value: string; active: boolean; additional_value_id: string }> = {};
    agencies.forEach((ag) => {
      const selectedAdditionalId = ag.additional_value_id ?? defaultAdditionalValueId ?? null;
      const selectedAdditional = plan?.additional_values?.find((val) => val.id === selectedAdditionalId);
      const commissionType = (selectedAdditional?.commission_type as CommissionType) || (ag.commission_type as CommissionType) || 'not_included';
      const currentValue = ag.commission_value ?? 0;
      const fallbackValue =
        commissionType === 'included'
          ? 0
          : ((!currentValue || Number(currentValue) === 0) && ag.commission_default
              ? ag.commission_default
              : currentValue);
      next[ag.id] = {
        commission_type: commissionType,
        commission_value: fallbackValue?.toString() ?? '0',
        active: !!ag.assigned,
        additional_value_id: String(selectedAdditionalId ?? ''),
      };
    });
    setFormState(next);
  }, [agencies, plan]);

  const mutation = useMutation({
    mutationFn: (payload: {
      agencyId: number;
      active: boolean;
      commission_type?: CommissionType;
      commission_value?: number;
      additional_value_id?: number;
    }) =>
      agencyService.saveAgencyPlanCommission(payload.agencyId, {
        insurance_plan_id: planId,
        commission_type: payload.commission_type,
        commission_value: payload.commission_value,
        additional_value_id: payload.additional_value_id,
        active: payload.active,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-agencies', planId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo guardar');
    },
  });

  const handleChange = (
    agencyId: number,
    field: 'commission_type' | 'commission_value' | 'active' | 'additional_value_id',
    value: string | boolean
  ) => {
    setFormState((prev) => ({
      ...prev,
      [agencyId]: {
        commission_type: (field === 'commission_type' ? value : prev[agencyId]?.commission_type || 'not_included') as CommissionType,
        commission_value: field === 'commission_value' ? (value as string) : prev[agencyId]?.commission_value || '0',
        active: field === 'active' ? Boolean(value) : prev[agencyId]?.active ?? false,
        additional_value_id:
          field === 'additional_value_id' ? (value as string) : prev[agencyId]?.additional_value_id ?? '',
      },
    }));
  };

  const handleTariffChange = (
    agencyId: number,
    value: string,
    additionalValues: NonNullable<InsurancePlan['additional_values']>
  ) => {
    const selected = additionalValues.find((v) => String(v.id) === value);
    setFormState((prev) => ({
      ...prev,
      [agencyId]: {
        commission_type: (selected?.commission_type as CommissionType) || prev[agencyId]?.commission_type || 'not_included',
        commission_value: selected?.commission_type === 'included' ? '0' : prev[agencyId]?.commission_value || '0',
        active: prev[agencyId]?.active ?? true,
        additional_value_id: value,
      },
    }));
  };

  const handleSaveAll = async () => {
    if (!agencies) return;
    try {
      for (const agency of agencies) {
        const state = formState[agency.id];
        const valueNum = Number(state?.commission_value ?? 0);
        const defaultTariffId = activeAdditionalValues.find((val) => val.is_default)?.id ?? activeAdditionalValues[0]?.id;
        const selectedTariffId = state?.additional_value_id || (defaultTariffId ? String(defaultTariffId) : '');
        if (state?.active && Number.isNaN(valueNum)) {
          toast.error(`La comisión de ${agency.name} debe ser numérica`);
          continue;
        }
        await mutation.mutateAsync({
          agencyId: agency.id,
          active: state?.active ?? false,
          commission_type: state?.active ? state?.commission_type : undefined,
          commission_value: state?.active ? valueNum : undefined,
          additional_value_id: state?.active && selectedTariffId ? Number(selectedTariffId) : undefined,
        });
      }
      toast.success('Asignaciones guardadas');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo guardar');
    }
  };

  const agenciesList = useMemo(() => agencies ?? [], [agencies]);

  const filteredAgencies = useMemo(() => {
    let result = agenciesList;
    if (filter === 'selected') {
      result = result.filter((ag) => (formState[ag.id]?.active ?? ag.assigned));
    } else if (filter === 'unselected') {
      result = result.filter((ag) => !(formState[ag.id]?.active ?? ag.assigned));
    }
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((ag) => ag.name.toLowerCase().includes(term));
    }
    return result;
  }, [agenciesList, search, filter, formState]);
  const activeAdditionalValues = useMemo(
    () => (plan?.additional_values?.filter((val) => val.active) ?? []),
    [plan?.additional_values]
  );

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-circle" onClick={() => navigate('/insurance-plans')}>
            <BiArrowBack className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BiLayer className="w-6 h-6 text-primary" />
              Asignar agencias al plan
            </h1>
            <p className="text-base-content/60">
              Plan: {plan?.name ?? '-'} {plan?.code ? `(${plan.code})` : ''}
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={handleSaveAll} disabled={mutation.isPending}>
          {mutation.isPending ? <span className="loading loading-spinner loading-xs" /> : <BiCheck className="w-4 h-4" />}
          Guardar todo
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="max-w-md w-full">
          <input
            type="text"
            className="input input-bordered w-full"
            placeholder="Filtrar por agencia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <button
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter('all')}
          >
            Todos
          </button>
          <button
            className={`btn btn-sm ${filter === 'selected' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter('selected')}
          >
            Seleccionados
          </button>
          <button
            className={`btn btn-sm ${filter === 'unselected' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilter('unselected')}
          >
            Sin seleccionar
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <span className="loading loading-spinner loading-lg" />
        </div>
      ) : filteredAgencies.length === 0 ? (
        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body">
            <p className="text-base-content/70">No hay agencias elegibles para este plan.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredAgencies.map((agency) => {
            const state =
              formState[agency.id] || { commission_type: 'not_included', commission_value: '0', active: !!agency.assigned, additional_value_id: '' };
            const disabled = !state.active;
            const activeCard = state.active;
            const additionalValues = activeAdditionalValues;
            const defaultTariffId = additionalValues.find((val) => val.is_default)?.id ?? additionalValues[0]?.id;
            const effectiveTariffId = state.additional_value_id || (defaultTariffId ? String(defaultTariffId) : '');
            const selectedTariff = additionalValues.find((val) => String(val.id) === effectiveTariffId);
            const tariffCommission = (selectedTariff?.commission_type as CommissionType) || state.commission_type;
            const tariffForcesIncluded = tariffCommission === 'included';
            return (
              <div
                key={agency.id}
                className={`rounded-lg border shadow-sm ${
                  activeCard ? 'border-blue-900 bg-blue-900/10' : 'border-gray-200 bg-gray-100'
                }`}
              >
                <div
                  className={`flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-t-lg ${
                    activeCard ? 'bg-blue-900 text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  <span className="truncate">{agency.name}</span>
                  <input
                    type="checkbox"
                    className="toggle toggle-sm toggle-primary"
                    checked={state.active}
                    onChange={(e) => handleChange(agency.id, 'active', e.target.checked)}
                  />
                </div>
                <div className="p-3 space-y-2">
                  {additionalValues.length > 0 && (
                    <div className="form-control">
                      <label className="label py-0">
                        <span className="label-text text-xs font-semibold">Tarifa</span>
                      </label>
                      <select
                        className="select select-bordered select-sm w-full"
                        value={effectiveTariffId}
                        onChange={(e) => handleTariffChange(agency.id, e.target.value, additionalValues)}
                        disabled={disabled}
                      >
                        {additionalValues.map((val) => (
                          <option key={val.id} value={val.id}>
                            {val.code}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex gap-2 items-center">
                    <select
                      className="select select-bordered select-sm w-1/2"
                      value={tariffForcesIncluded ? 'included' : tariffCommission || 'not_included'}
                      onChange={(e) => handleChange(agency.id, 'commission_type', e.target.value)}
                      disabled={true} // La comisión depende de la tarifa
                    >
                      <option value="included">Neta</option>
                      <option value="not_included">Comisionable</option>
                    </select>
                    <input
                      type="number"
                      className="input input-bordered input-sm w-1/2"
                      value={tariffForcesIncluded ? '0' : state.commission_value || '0'}
                      onChange={(e) => handleChange(agency.id, 'commission_value', e.target.value)}
                      disabled={disabled || tariffForcesIncluded}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InsurancePlanAgenciesPage;
