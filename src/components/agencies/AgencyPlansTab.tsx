import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BiLayer, BiCheck } from 'react-icons/bi';
import { agencyService } from '../../services/agencyService';
import { toast } from 'react-hot-toast';

type CommissionType = 'included' | 'not_included';

interface AgencyPlan {
  id: number;
  name: string;
  code?: string;
  commission_type?: CommissionType | null;
  commission_value?: number | string | null;
  additional_value_id?: number | string | null;
  additional_values?: {
    id: number;
    code: string;
    commission_type?: CommissionType | null;
    value_amount?: number;
    active?: boolean;
    is_default?: boolean;
  }[];
  assigned?: boolean;
}

interface PlanGroup {
  company: { id: number; name: string } | null;
  plans: AgencyPlan[];
}

interface Props {
  agencyId: number;
  defaultCommission?: number;
}

const AgencyPlansTab: React.FC<Props> = ({ agencyId, defaultCommission = 0 }) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<PlanGroup[]>({
    queryKey: ['agency-plans', agencyId],
    queryFn: () => agencyService.getAgencyPlans(agencyId),
    enabled: !!agencyId,
  });

  const mutation = useMutation({
    mutationFn: (payload: { planId: number; commission_type?: CommissionType; commission_value?: number; additional_value_id?: number; active: boolean }) =>
      agencyService.saveAgencyPlanCommission(agencyId, {
        insurance_plan_id: payload.planId,
        commission_type: payload.commission_type,
        commission_value: payload.commission_value,
        additional_value_id: payload.additional_value_id,
        active: payload.active,
      }),
    onSuccess: () => {
      toast.success('Comisión guardada');
      queryClient.invalidateQueries({ queryKey: ['agency-plans', agencyId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'No se pudo guardar la comisión');
    },
  });

  const [formState, setFormState] = useState<Record<
    number,
    { commission_type: CommissionType; commission_value: string; active: boolean; additional_value_id: string }
  >>({});
  const [savingAll, setSavingAll] = useState(false);
  const [companyActive, setCompanyActive] = useState<Record<number, boolean>>({});
  const [companyCommission, setCompanyCommission] = useState<Record<number, string>>({});
  const planHeaderStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-secondary)',
    color: 'var(--color-secondary-content)',
  };
  const normalizedDefaultCommission = Number.isFinite(defaultCommission) ? defaultCommission : 0;

  const groups = useMemo(() => data ?? [], [data]);
  const planById = useMemo(() => {
    const map: Record<number, AgencyPlan> = {};
    groups.forEach((group) => {
      group.plans.forEach((plan) => {
        map[plan.id] = plan;
      });
    });
    return map;
  }, [groups]);
  const planWasAssignedMap = useMemo(() => {
    const map: Record<number, boolean> = {};
    groups.forEach((group) => {
      group.plans.forEach((plan) => {
        map[plan.id] = Boolean(plan.assigned);
      });
    });
    return map;
  }, [groups]);

  useEffect(() => {
    if (groups.length === 0) return;
    const nextState: Record<number, { commission_type: CommissionType; commission_value: string; active: boolean; additional_value_id: string }> = {};
    const nextCompany: Record<number, boolean> = {};
    const nextCompanyCommission: Record<number, string> = {};
    groups.forEach((group) => {
      const key = group.company?.id ?? 0;
      group.plans.forEach((plan) => {
        const defaultValueId =
          plan.additional_values?.find((val) => val.is_default && val.active)?.id ?? null;
        const selectedTariff = plan.additional_values?.find(
          (val) => String(val.id) === String(plan.additional_value_id ?? defaultValueId ?? '')
        );
        const commissionType = (selectedTariff?.commission_type as CommissionType) || (plan.commission_type as CommissionType) || 'not_included';
        const hasSavedCommission = Boolean(plan.assigned) && plan.commission_value !== null && plan.commission_value !== undefined;
        const fallbackCommissionValue = hasSavedCommission ? Number(plan.commission_value) : normalizedDefaultCommission;
        nextState[plan.id] = {
          commission_type: commissionType,
          commission_value: commissionType === 'included' ? '0' : String(fallbackCommissionValue),
          active: !!plan.assigned,
          additional_value_id: String(plan.additional_value_id ?? defaultValueId ?? ''),
        };
      });
      nextCompany[key] = group.plans.some((p) => p.assigned) || true;
      const firstPlan = group.plans[0];
      const firstPlanHasSavedCommission = Boolean(firstPlan?.assigned) && firstPlan?.commission_value !== null && firstPlan?.commission_value !== undefined;
      nextCompanyCommission[key] = String(
        firstPlanHasSavedCommission ? Number(firstPlan?.commission_value) : normalizedDefaultCommission
      );
    });
    setFormState(nextState);
    setCompanyActive(nextCompany);
    setCompanyCommission(nextCompanyCommission);
  }, [groups, normalizedDefaultCommission]);

  const handleChange = (
    planId: number,
    field: 'commission_type' | 'commission_value' | 'active' | 'additional_value_id',
    value: string | boolean
  ) => {
    setFormState((prev) => ({
      ...prev,
      [planId]: {
        commission_type: (field === 'commission_type' ? value : prev[planId]?.commission_type || 'not_included') as CommissionType,
        commission_value: field === 'commission_value' ? (value as string) : prev[planId]?.commission_value || '0',
        active: field === 'active' ? Boolean(value) : prev[planId]?.active ?? false,
        additional_value_id:
          field === 'additional_value_id' ? (value as string) : prev[planId]?.additional_value_id ?? '',
      },
    }));
  };

  const handleTariffChange = (
    planId: number,
    value: string,
    planValues: NonNullable<AgencyPlan['additional_values']>
  ) => {
    const selected = planValues.find((v) => String(v.id) === value);
    const selectedCommissionType = (selected?.commission_type as CommissionType) || 'not_included';
    setFormState((prev) => ({
      ...prev,
      [planId]: {
        commission_type: selectedCommissionType,
        commission_value: (() => {
          if (selectedCommissionType === 'included') {
            return '0';
          }

          const previousValue = prev[planId]?.commission_value ?? '0';
          const wasAssigned = planWasAssignedMap[planId] ?? false;
          const shouldApplyDefault = !wasAssigned && Number(previousValue) === 0;

          return shouldApplyDefault ? String(normalizedDefaultCommission) : previousValue;
        })(),
        active: prev[planId]?.active ?? true,
        additional_value_id: value,
      },
    }));
  };

  const toggleCompany = (companyId: number, enabled: boolean, plans: AgencyPlan[]) => {
    setCompanyActive((prev) => ({ ...prev, [companyId]: enabled }));
    setFormState((prev) => {
      const updated = { ...prev };
      plans.forEach((plan) => {
        updated[plan.id] = {
          commission_type: prev[plan.id]?.commission_type || 'not_included',
          commission_value: prev[plan.id]?.commission_value || '0',
          active: enabled ? true : false,
          additional_value_id: prev[plan.id]?.additional_value_id ?? '',
        };
      });
      return updated;
    });
  };

  const setCommissionForCompany = (companyId: number, value: string, plans: AgencyPlan[]) => {
    setCompanyCommission((prev) => ({ ...prev, [companyId]: value }));
    setFormState((prev) => {
      const updated = { ...prev };
      plans.forEach((plan) => {
        const planValues = (plan.additional_values ?? []).filter((val) => val.active !== false);
        const selectedTariff = planValues.find(
          (v) => String(v.id) === String(prev[plan.id]?.additional_value_id || '')
        );
        const commissionType = (selectedTariff?.commission_type as CommissionType) || prev[plan.id]?.commission_type || 'not_included';
        updated[plan.id] = {
          commission_type: commissionType,
          commission_value: commissionType === 'included' ? '0' : value,
          active: prev[plan.id]?.active ?? true,
          additional_value_id: prev[plan.id]?.additional_value_id ?? '',
        };
      });
      return updated;
    });
  };

  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      const entries = Object.entries(formState);
      for (const [planIdStr, state] of entries) {
        const planId = Number(planIdStr);
        if (state.active && Number.isNaN(Number(state.commission_value))) {
          toast.error(`La comisión del plan ${planId} debe ser numérica`);
          continue;
        }

        const plan = planById[planId];
        const activePlanValues = (plan?.additional_values ?? []).filter((val) => val.active !== false);
        const defaultTariffId = activePlanValues.find((val) => val.is_default)?.id ?? activePlanValues[0]?.id;
        const selectedTariffId = state.additional_value_id || (defaultTariffId ? String(defaultTariffId) : '');

        await agencyService.saveAgencyPlanCommission(agencyId, {
          insurance_plan_id: planId,
          commission_type: state.active ? state.commission_type : undefined,
          commission_value: state.active ? Number(state.commission_value) : undefined,
          additional_value_id: state.active && selectedTariffId ? Number(selectedTariffId) : undefined,
          active: state.active,
        });
      }
      toast.success('Planes guardados');
      queryClient.invalidateQueries({ queryKey: ['agency-plans', agencyId] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'No se pudo guardar los planes');
    } finally {
      setSavingAll(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body">
          <div className="flex items-center gap-2">
            <BiLayer className="w-5 h-5 text-primary" />
            <h3 className="card-title">Planes</h3>
          </div>
          <div className="py-6 flex justify-center">
            <span className="loading loading-spinner loading-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.length === 0 ? (
        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body">
            <div className="flex items-center gap-2">
              <BiLayer className="w-5 h-5 text-primary" />
              <h3 className="card-title">Planes</h3>
            </div>
            <p className="text-base-content/60">No hay planes disponibles para esta agencia.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button className="btn btn-primary btn-sm" onClick={handleSaveAll} disabled={savingAll || mutation.isPending}>
              {savingAll ? <span className="loading loading-spinner loading-xs" /> : <BiCheck className="w-4 h-4" />}
              Guardar todo
            </button>
          </div>
          {groups.map((group, idx) => {
            const companyId = group.company?.id ?? 0;
            const companyEnabled = companyActive[companyId] ?? true;
            return (
              <div key={companyId ?? `no-company-${idx}`} className="card bg-base-100 shadow border border-base-200">
                <div className="card-body space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-base-content/60">Compañía</div>
                      <div className="text-lg font-semibold">{group.company?.name || 'Sin compañía'}</div>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="toggle toggle-primary"
                        checked={companyEnabled}
                        onChange={(e) => toggleCompany(companyId, e.target.checked, group.plans)}
                      />
                      <span className="text-sm">{companyEnabled ? 'Habilitar' : 'Deshabilitar'}</span>
                    </label>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="text-sm text-base-content/60">Valor comisión (aplica a todos)</div>
                    <input
                      type="number"
                      className="input input-bordered input-sm w-32"
                      value={companyCommission[companyId] ?? '0'}
                      onChange={(e) => setCommissionForCompany(companyId, e.target.value, group.plans)}
                      disabled={!companyEnabled}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {group.plans.map((plan) => {
                      const state =
                        formState[plan.id] || { commission_type: 'not_included', commission_value: '0', active: !!plan.assigned, additional_value_id: '' };
                      const disabled = !companyEnabled || !state.active;
                      const planValues = (plan.additional_values ?? []).filter((val) => val.active !== false);
                      const defaultTariffId = planValues.find((val) => val.is_default)?.id ?? planValues[0]?.id;
                      const effectiveTariffId = state.additional_value_id || (defaultTariffId ? String(defaultTariffId) : '');
                      const selectedTariff = planValues.find(
                        (val) => String(val.id) === effectiveTariffId
                      );
                      const tariffCommission = (selectedTariff?.commission_type as CommissionType) || state.commission_type;
                      const tariffForcesIncluded = tariffCommission === 'included';
                      return (
                        <div key={plan.id} className="rounded-lg border border-base-200 bg-base-200/70 shadow-sm text-base-content">
                          <div className="flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-t-lg border-b border-base-200" style={planHeaderStyle}>
                            <span className="truncate">{plan.name}</span>
                            <input
                              type="checkbox"
                              className="toggle toggle-sm toggle-primary"
                              checked={state.active && companyEnabled}
                              onChange={(e) => handleChange(plan.id, 'active', e.target.checked)}
                              disabled={!companyEnabled}
                            />
                          </div>
                          <div className="p-3 space-y-2">
                            {planValues.length > 0 && (
                              <div className="form-control">
                                <label className="label py-0">
                                  <span className="label-text text-xs font-semibold">Tarifa</span>
                                </label>
                                <select
                                  className="select select-bordered select-sm w-full"
                                  value={effectiveTariffId}
                                  onChange={(e) => handleTariffChange(plan.id, e.target.value, planValues)}
                                  disabled={disabled}
                                >
                                  {planValues.map((val) => (
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
                                onChange={(e) => handleChange(plan.id, 'commission_type', e.target.value)}
                                disabled={true} // La comisión depende de la tarifa y no se puede cambiar manualmente
                              >
                                <option value="included">Neta</option>
                                <option value="not_included">Comisionable</option>
                              </select>
                              <input
                                type="number"
                                className="input input-bordered input-sm w-1/2"
                                value={tariffForcesIncluded ? '0' : state.commission_value}
                                onChange={(e) => handleChange(plan.id, 'commission_value', e.target.value)}
                                disabled={disabled || tariffForcesIncluded}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
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

export default AgencyPlansTab;
