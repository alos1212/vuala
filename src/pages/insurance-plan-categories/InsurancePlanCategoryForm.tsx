// src/components/InsurancePlanCategoryForm.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { insurancePlanCategoryService } from '../../services/insurancePlanCategoryService';
import type { InsurancePlanCategory } from '../../types/insurancePlanCategory';

export const InsurancePlanCategoryForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Omit<InsurancePlanCategory, 'id' | 'created_at' | 'updated_at'>>({
    name: '',
    deletable: true, // Por defecto, las nuevas categorías son eliminables
  });
  const [isEditable, setIsEditable] = useState<boolean>(true);
  const [showDeletableOption, setShowDeletableOption] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      const fetchCategory = async () => {
        const data = await insurancePlanCategoryService.getInsurancePlanCategory(Number(id));
        setFormData({ name: data.name, deletable: data.deletable });
        setIsEditable(data.deletable); // Si no es eliminable, no es editable
        setShowDeletableOption(true); // Mostrar la opción solo al editar
      };
      fetchCategory();
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (id && isEditable) {
        await insurancePlanCategoryService.updateInsurancePlanCategory(Number(id), formData);
      } else if (!id) {
        await insurancePlanCategoryService.createInsurancePlanCategory(formData);
      }
      navigate('/insurance-plan-categories');
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">
          {id ? 'Editar Categoría' : 'Crear Categoría'}
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
              onClick={() => navigate('/insurance-plan-categories')}
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
