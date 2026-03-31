import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaEdit, FaTrash, FaPlus, FaBuilding } from 'react-icons/fa';
import { insurancePlanService } from '../../services/insurancePlanService';
import type { InsurancePlan } from '../../types/insurancePlan';

export const InsurancePlanPage = () => {
  const [plans, setPlans] = useState<InsurancePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const data = await insurancePlanService.getInsurancePlans();
      setPlans(data);
    } catch (error) {
      console.error('Error al cargar planes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    await insurancePlanService.deleteInsurancePlan(id);
    fetchPlans();
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return (
    <div className="px-4 py-6">
      <div className="container mx-auto">
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Planes de Seguros</h1>
          <button
            className="btn btn-outline btn-primary btn-sm"
            onClick={() => navigate('/insurance-plans/create')}
          >
            <FaPlus className="mr-1" /> Agregar
          </button>
        </div>
        {/* Contenedor tabla */}
        <div className="overflow-x-auto bg-white shadow-md rounded-lg">
          {isLoading ? (
            <div className="text-center py-6">Cargando planes...</div>
          ) : plans.length === 0 ? (
            <div className="text-center py-6">No hay planes registrados</div>
          ) : (
            <table className="table w-full">
              <thead className="hidden md:table-header-group">
                <tr className="bg-gray-100 text-gray-700">
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Código</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    {/* Desktop */}
                    <td className="px-4 py-2 hidden md:table-cell">{plan.id}</td>
                    <td className="px-4 py-2 hidden md:table-cell">{plan.name}</td>
                    <td className="px-4 py-2 hidden md:table-cell">{plan.code}</td>
                    <td className="px-4 py-2 hidden md:table-cell">{plan.status}</td>
                    <td className="px-4 py-2 text-right hidden md:table-cell">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => navigate(`/insurance-plans/${plan.id}/agencies`)}
                          className="btn btn-xs btn-outline"
                          title="Agencias"
                        >
                          <FaBuilding />
                        </button>
                        <button
                          onClick={() => navigate(`/insurance-plans/edit/${plan.id}`)}
                          className="btn btn-xs btn-outline btn-primary"
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(plan.id)}
                          className="btn btn-xs btn-outline btn-error"
                          title="Eliminar"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                    {/* Mobile */}
                    <td colSpan={5} className="md:hidden block p-4 border-t">
                      <div className="space-y-2">
                        <div><strong>ID:</strong> {plan.id}</div>
                        <div><strong>Nombre:</strong> {plan.name}</div>
                        <div><strong>Código:</strong> {plan.code}</div>
                        <div><strong>Estado:</strong> {plan.status}</div>
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => navigate(`/insurance-plans/${plan.id}/agencies`)}
                            className="btn btn-xs btn-outline"
                          >
                            <FaBuilding />
                          </button>
                          <button
                            onClick={() => navigate(`/insurance-plans/edit/${plan.id}`)}
                            className="btn btn-xs btn-outline btn-primary"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(plan.id)}
                            className="btn btn-xs btn-outline btn-error"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsurancePlanPage;
