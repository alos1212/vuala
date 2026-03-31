import React, { useEffect, useState } from "react";
import type { InsurancePlan } from "../../../types/insurancePlan";
import type { Company } from "../../../types/company";
import { companyService } from "../../../services/companyService";

interface PageAssignmentProps {
  form: InsurancePlan & { companies?: Company[] | number[] };
  setForm: React.Dispatch<React.SetStateAction<InsurancePlan>>;
}

const PageAssignment = ({ form, setForm }: PageAssignmentProps) => {
  const [availableCompanies, setAvailableCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const companies = await companyService.getCompanies();
        setAvailableCompanies(companies);
      } catch (error) {
        console.error("Error al cargar las compañías:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanies();
  }, []);



  const handleCompanyToggle = (companyId: number) => {
    let currentCompanyIds: number[] = [];

    if (Array.isArray(form.companies)) {
      // If companies is an array of Company objects or numbers
      if (form.companies.length > 0 && typeof form.companies[0] === "object") {
        // @ts-ignore
        currentCompanyIds = (form.companies as Company[]).map((c) => (c as Company).id);
      } else {
        currentCompanyIds = form.companies as number[];
      }
    }

    const isSelected = currentCompanyIds.includes(companyId);

    if (isSelected) {
      const updatedCompanies = currentCompanyIds.filter((id) => id !== companyId);
      setForm((prev) => ({ ...prev, companies: updatedCompanies }));
    } else {
      setForm((prev) => ({ ...prev, companies: [...currentCompanyIds, companyId] }));
    }
  };

  const isCompanySelected = (companyId: number): boolean => {
      let currentCompanyIds: number[] = [];

      if (Array.isArray(form.companies)) {
        // If companies is an array of Company objects or numbers
        if (form.companies.length > 0 && typeof form.companies[0] === "object") {
          // @ts-ignore
          currentCompanyIds = (form.companies as Company[]).map((c) => (c as Company).id);
        } else {
          currentCompanyIds = form.companies as number[];
        }
      }

    return currentCompanyIds.includes(companyId);
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold text-gray-700 mb-4">Asignación de Compañías</h2>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando compañías...</p>
      ) : availableCompanies.length === 0 ? (
        <p className="text-sm text-gray-500">No hay compañías disponibles.</p>
      ) : (
        <>
          {/* Vista tabla en pantallas medianas y grandes */}
          <div className="hidden md:block overflow-x-auto">
            <table className="table table-sm w-full">
              <thead>
                <tr className="text-gray-600 text-sm bg-gray-50">
                  <th className="p-3">ID</th>
                  <th className="p-3">Nombre</th>
                  <th className="p-3 text-center">Seleccionado</th>
                </tr>
              </thead>
              <tbody>
                {availableCompanies.map((company) => (
                  <tr
                    key={company.id}
                    onClick={() => handleCompanyToggle(company.id)}
                    className={`hover:bg-blue-100 transition-colors duration-150 cursor-pointer ${
                      isCompanySelected(company.id) ? "bg-blue-200" : "bg-white"
                    }`}
                  >
                    <td className="p-3">{company.id}</td>
                    <td className="p-3">{company.name}</td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isCompanySelected(company.id)}
                        onChange={() => handleCompanyToggle(company.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="checkbox checkbox-primary checkbox-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vista tarjetas en pantallas pequeñas */}
          <div className="md:hidden space-y-3">
            {availableCompanies.map((company) => (
              <div
                key={company.id}
                onClick={() => handleCompanyToggle(company.id)}
                className={`border rounded-lg p-3 shadow-sm flex items-center justify-between transition-colors duration-150 cursor-pointer ${
                  isCompanySelected(company.id) ? "bg-blue-200 border-blue-400" : "bg-gray-50 hover:bg-gray-100 border-gray-200"
                }`}
              >
                <div>
                  <p className="font-medium text-gray-700">{company.name}</p>
                  <p className="text-xs text-gray-500">ID: {company.id}</p>
                </div>
                <input
                  type="checkbox"
                  checked={isCompanySelected(company.id)}
                  onChange={() => handleCompanyToggle(company.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="checkbox checkbox-primary"
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default PageAssignment;
