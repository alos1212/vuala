import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BiBuilding, BiPlus, BiRightArrowAlt, BiSearch, BiTrash } from 'react-icons/bi';
import { companyService } from '../../services/companyService';
import type { Company } from '../../types/company';
import { getCompanyLogo } from '../../utils/authHelpers';

const CompaniesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['companies', search],
    queryFn: () => companyService.getCompanies({ search, per_page: 100 }),
  });

  const companies = data?.data ?? [];

  const companyLogos = React.useMemo(
    () => Object.fromEntries(companies.map((company) => [company.id, getCompanyLogo(company)])),
    [companies]
  );

  const handleDelete = async (company: Company) => {
    if (!window.confirm(`¿Eliminar la compañía ${company.name}?`)) return;
    await companyService.deleteCompany(company.id);
    queryClient.invalidateQueries({ queryKey: ['companies'] });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BiBuilding className="w-7 h-7 text-primary" />
            Compañías
          </h1>
          <p className="text-base-content/60">Administra las compañías que operan su propio CRM dentro del sistema.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/companies/create')}>
          <BiPlus className="w-5 h-5" />
          Nueva compañía
        </button>
      </div>

      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body">
          <label className="label pb-1">
            <span className="label-text text-sm text-base-content/70">Buscar compañías</span>
          </label>
          <div className="relative">
            <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
            <input
              className="input input-bordered w-full pl-12"
              placeholder="Nombre, NIT, correo o teléfono"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center"><span className="loading loading-spinner loading-lg" /></div>
      ) : companies.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-base-300 p-10 text-center text-base-content/60">
          No hay compañías registradas.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-base-200 bg-base-100 shadow">
          <table className="table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>NIT</th>
                <th>Contacto</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((company) => (
                <tr key={company.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar">
                        <div className="w-11 h-11 rounded-2xl border border-base-300 bg-base-50">
                          {companyLogos[company.id] ? (
                            <img src={companyLogos[company.id] || ''} alt={`Logo de ${company.name}`} className="object-contain p-1.5" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-base-content/40">
                              <BiBuilding className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="font-semibold">{company.name}</div>
                    </div>
                  </td>
                  <td>{company.tax_id || '-'}</td>
                  <td>
                    <div className="text-sm">
                      <div>{company.email || '-'}</div>
                      <div className="text-base-content/60">{company.phone || '-'}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${company.status === 0 ? 'badge-ghost' : 'badge-success'}`}>
                      {company.status === 0 ? 'Inactiva' : 'Activa'}
                    </span>
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <button className="btn btn-outline btn-sm" onClick={() => navigate(`/companies/${company.id}`)}>
                        <BiRightArrowAlt className="w-4 h-4" />
                        Detalle
                      </button>
                      <button className="btn btn-outline btn-sm btn-error" onClick={() => handleDelete(company)}>
                        <BiTrash className="w-4 h-4" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isFetching && <div className="text-sm text-base-content/50">Actualizando listado...</div>}
    </div>
  );
};

export default CompaniesPage;
