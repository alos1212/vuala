// src/components/InsurancePlanCategoryList.tsx
import { useEffect, useState } from 'react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import type { InsurancePlanCategory } from '../../types/insurancePlanCategory';
import { insurancePlanCategoryService } from '../../services/insurancePlanCategoryService';

export const InsurancePlanCategoryList = () => {
  const [categories, setCategories] = useState<InsurancePlanCategory[]>([]);

  useEffect(() => {
    const fetchCategories = async () => {
      const data = await insurancePlanCategoryService.getInsurancePlanCategories();
      setCategories(data);
    };
    fetchCategories();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await insurancePlanCategoryService.deleteInsurancePlanCategory(id);
      setCategories(categories.filter((category) => category.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">
          Categorías de Plan de Seguros
        </h1>
        <Link
          to="/insurance-plan-categories/create"
          className="btn btn-primary btn-md flex items-center gap-2"
        >
          <FaPlus />
          Crear Categoría
        </Link>
      </div>

      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-gray-700">
                <th className="py-3 px-4 bg-gray-100">ID</th>
                <th className="py-3 px-4 bg-gray-100">Nombre</th>
                <th className="py-3 px-4 bg-gray-100">¿Eliminable?</th>
                <th className="py-3 px-4 bg-gray-100">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className="border-b border-gray-200 hover:bg-gray-50"
                >
                  <td className="py-3 px-4">{category.id}</td>
                  <td className="py-3 px-4">{category.name}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`badge ${category.deletable ? 'badge-success' : 'badge-error'}`}
                    >
                      {category.deletable ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="py-3 px-4 flex gap-2">
                    <Link
                      to={`/insurance-plan-categories/edit/${category.id}`}
                      className={`btn btn-info btn-sm ${!category.deletable ? 'btn-disabled' : ''}`}
                    >
                      <FaEdit />
                    </Link>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className={`btn btn-error btn-sm ${!category.deletable ? 'btn-disabled' : ''}`}
                      disabled={!category.deletable}
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
