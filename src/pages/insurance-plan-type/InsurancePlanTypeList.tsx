import { useEffect, useState } from 'react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import type { InsurancePlanType } from '../../types/insurancePlanType';
import { insurancePlanTypeService } from '../../services/insurancePlanTypeService';

export const InsurancePlanTypeList = () => {
  const [planTypes, setPlanTypes] = useState<InsurancePlanType[]>([]);

  useEffect(() => {
    const fetchPlanTypes = async () => {
      const data = await insurancePlanTypeService.getInsurancePlanTypes();
      setPlanTypes(data);
    };
    fetchPlanTypes();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await insurancePlanTypeService.deleteInsurancePlanType(id);
      setPlanTypes(planTypes.filter((plan) => plan.id !== id));
    } catch (error) {
      console.error('Error deleting plan type:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Tipos de Plan de Seguros
        </h1>
        <Link
          to="/insurance-plan-types/create"
          className="btn btn-primary btn-md flex items-center gap-2"
        >
          <FaPlus />
          Crear Tipo de Plan
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-gray-700">
                <th className="py-3 px-4 bg-gray-100">ID</th>
                <th className="py-3 px-4 bg-gray-100">Nombre</th>
                <th className="py-3 px-4 bg-gray-100">Periodicidad</th>
                <th className="py-3 px-4 bg-gray-100">Orígenes</th>
                <th className="py-3 px-4 bg-gray-100">¿Eliminable?</th>
                <th className="py-3 px-4 bg-gray-100">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {planTypes.map((plan) => {
                const normalizedName = plan.name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') ?? '';
                const scope = plan.geo_scope ?? (normalizedName.includes('nacional') ? 'national' : 'international');
                return (
                  <tr
                    key={plan.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">{plan.id}</td>
                    <td className="py-3 px-4">{plan.name}</td>
                    <td className="py-3 px-4 capitalize">
                      {plan.periodicity === 'day' && 'Por día'}
                      {plan.periodicity === 'month' && 'Mensual'}
                      {plan.periodicity === 'year' && 'Anual'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`badge ${scope === 'national' ? 'badge-info' : 'badge-secondary'}`}>
                        {scope === 'national' ? 'Nacional' : 'Internacional'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`badge ${plan.deletable ? 'badge-success' : 'badge-error'}`}
                      >
                        {plan.deletable ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="py-3 px-4 flex gap-2">
                      <Link
                        to={`/insurance-plan-types/edit/${plan.id}`}
                        className={`btn btn-info btn-sm ${!plan.deletable ? 'btn-disabled' : ''}`}
                      >
                        <FaEdit />
                      </Link>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className={`btn btn-error btn-sm ${!plan.deletable ? 'btn-disabled' : ''}`}
                        disabled={!plan.deletable}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
