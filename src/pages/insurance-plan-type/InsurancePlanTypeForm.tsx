import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { insurancePlanTypeService } from '../../services/insurancePlanTypeService';
import type { InsurancePlanType, PlanPeriodicity, PlanGeoScope } from '../../types/insurancePlanType';

export const InsurancePlanTypeForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Omit<InsurancePlanType, 'id' | 'created_at' | 'updated_at'>>({
    name: '',
    deletable: true,
    periodicity: 'day',
    geo_scope: 'international',
  });
  const [isEditable, setIsEditable] = useState<boolean>(true);
  const [showDeletableOption, setShowDeletableOption] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      const fetchPlanType = async () => {
        const data = await insurancePlanTypeService.getInsurancePlanType(Number(id));
        const fallbackScope =
          data.name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes('nacional')
            ? 'national'
            : 'international';
        setFormData({
          name: data.name,
          deletable: data.deletable,
          periodicity: data.periodicity,
          geo_scope: data.geo_scope ?? fallbackScope,
        });
        setIsEditable(data.deletable); // Si no es eliminable, no es editable
        setShowDeletableOption(true); // Mostrar la opción solo al editar
      };
      fetchPlanType();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (id && isEditable) {
        await insurancePlanTypeService.updateInsurancePlanType(Number(id), formData);
      } else if (!id) {
        await insurancePlanTypeService.createInsurancePlanType(formData);
      }
      navigate('/insurance-plan-types');
    } catch (error) {
      console.error('Error saving plan type:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {id ? 'Editar Tipo de Plan' : 'Crear Tipo de Plan'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="form-control">
            <label className="label">
              <span className="label-text text-gray-700">Nombre</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input input-bordered w-full"
              required
              readOnly={!isEditable}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-gray-700">Periodicidad</span>
            </label>
            <select
              value={formData.periodicity}
              onChange={(e) => setFormData({ ...formData, periodicity: e.target.value as PlanPeriodicity })}
              className="select select-bordered"
              required
              disabled={!isEditable}
            >
              <option value="day">Por día</option>
              <option value="month">Mensual</option>
              <option value="year">Anual</option>
            </select>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text text-gray-700">Orígenes que aplica</span>
            </label>
            <select
              value={formData.geo_scope}
              onChange={(e) => setFormData({ ...formData, geo_scope: e.target.value as PlanGeoScope })}
              className="select select-bordered"
              required
              disabled={!isEditable}
            >
              <option value="international">Internacional</option>
              <option value="national">Nacional</option>
            </select>
          </div>

          {/* Campo "¿Eliminable?" solo visible al editar */}
          {showDeletableOption && (
            <div className="form-control">
              <label className="label cursor-pointer justify-start gap-2">
                <input
                  type="checkbox"
                  checked={formData.deletable}
                  onChange={(e) => setFormData({ ...formData, deletable: e.target.checked })}
                  className="checkbox checkbox-primary"
                  disabled={!isEditable}
                />
                <span className="label-text text-gray-700">¿Eliminable?</span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={() => navigate('/insurance-plan-types')}
              className="btn btn-ghost"
            >
              Cancelar
            </button>
            {isEditable && (
              <button type="submit" className="btn btn-primary">
                Guardar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
