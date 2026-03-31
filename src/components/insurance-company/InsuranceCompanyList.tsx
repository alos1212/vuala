import { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import { insuranceCompanyService } from '../../services/insuranceCompanyService';
import type { InsuranceCompany } from '../../types/insuranceCompany';
import InsuranceCompanyModal from './InsuranceCompanyModal';

const InsuranceCompanyList = () => {
  const [companies, setCompanies] = useState<InsuranceCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<InsuranceCompany | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const data = await insuranceCompanyService.getInsuranceCompanies();
      setCompanies(data);
    } catch (error) {
      console.error('Error al cargar compañías:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (company: InsuranceCompany) => {
    setSelectedCompany(company);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    await insuranceCompanyService.deleteInsuranceCompany(id);
    fetchCompanies();
  };

  return (
    <div className="px-4 py-6">
      <div className="container mx-auto">
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Compañías de Seguros</h1>
          <button
            className="btn btn-outline btn-primary btn-sm"
            onClick={() => {
              setSelectedCompany(null);
              setIsModalOpen(true);
            }}
          >
            <FaPlus className="mr-1" /> Agregar
          </button>
        </div>

        {/* Contenedor tabla */}
        <div className="overflow-x-auto bg-white shadow-md rounded-lg">
          {isLoading ? (
            <div className="text-center py-6">Cargando compañías...</div>
          ) : companies.length === 0 ? (
            <div className="text-center py-6">No hay compañías registradas</div>
          ) : (
            <table className="table w-full">
              <thead className="hidden md:table-header-group">
                <tr className="bg-gray-100 text-gray-700">
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">Logo</th>
                  <th className="px-4 py-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    {/* Desktop */}
                    <td className="px-4 py-2 hidden md:table-cell">{company.id}</td>
                    <td className="px-4 py-2 hidden md:table-cell">{company.name}</td>
                    <td className="px-4 py-2 hidden md:table-cell">
                      {company.logo_url && (
                        <img src={company.logo_url} alt={company.name} className="h-8" />
                      )}
                    </td>
                    <td className="px-4 py-2 text-right hidden md:table-cell">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => handleEdit(company)}
                          className="btn btn-xs btn-outline btn-primary"
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(company.id)}
                          className="btn btn-xs btn-outline btn-error"
                          title="Eliminar"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>

                    {/* Mobile */}
                    <td colSpan={4} className="md:hidden block p-4 border-t">
                      <div className="space-y-2">
                        <div><strong>ID:</strong> {company.id}</div>
                        <div><strong>Nombre:</strong> {company.name}</div>
                        {company.logo_url && (
                          <div><img src={company.logo_url} alt={company.name} className="h-10" /></div>
                        )}
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => handleEdit(company)}
                            className="btn btn-xs btn-outline btn-primary"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => handleDelete(company.id)}
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

      <InsuranceCompanyModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        company={selectedCompany}
        onSave={fetchCompanies}
      />
    </div>
  );
};

export default InsuranceCompanyList;
