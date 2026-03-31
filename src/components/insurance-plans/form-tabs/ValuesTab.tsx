import React from 'react';
import type { InsurancePlan } from '../../../types/insurancePlan';
import AdditionalCostsSection from './AdditionalCostsSection';
import AdditionalValuesSection from './AdditionalValuesSection';

interface Props {
  form: InsurancePlan;
  setForm: React.Dispatch<React.SetStateAction<InsurancePlan>>;
}

const ValuesTab: React.FC<Props> = ({ form, setForm }) => {
  const handleChange = (key: keyof InsurancePlan, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Columna Costos */}
      <div className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-semibold text-gray-700">Costos</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Tipo de costo</span>
              </label>
              <select
                className="select select-bordered"
                value={form.cost_of ?? ''}
                onChange={(e) => handleChange('cost_of', e.target.value)}
              >
                <option value="1">Archivo</option>
                <option value="2">Dia</option>
                <option value="3">%</option>
                <option value="4">Total</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-semibold">Costo base</span>
              </label>
              <input
                type="number"
                className="input input-bordered"
                value={form.cost_value ?? 0}
                onChange={(e) => handleChange('cost_value', Number(e.target.value))}
                min={0}
                step="0.01"
              />
            </div>
          </div>
        </div>

        <AdditionalCostsSection planId={form?.id} />
      </div>

      {/* Columna Valores */}
      <div className="space-y-6 md:border-l md:border-gray-200 md:pl-6">
        <AdditionalValuesSection planId={form?.id} />
      </div>
    </div>
  );
};

export default ValuesTab;
