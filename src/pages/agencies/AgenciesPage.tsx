import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BiBuilding, BiPlus, BiSearch, BiRightArrowAlt, BiTrash } from 'react-icons/bi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PaginatedResponse } from '../../types/api';
import { agencyService } from '../../services/agencyService';
import type { Agency } from '../../types/agency';

const AgenciesPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 100;

  const { data, isLoading, isFetching } = useQuery<PaginatedResponse<Agency>>({
    queryKey: ['agencies', page, search],
    queryFn: () => agencyService.getAgenciesPaginated({ page, per_page: perPage, search }),
    refetchOnWindowFocus: false,
  });

  const normalizePagination = (payload: any) => {
    const raw = payload?.data && Array.isArray(payload.data?.data) ? payload.data : payload;
    const list = Array.isArray(raw?.data) ? raw.data : [];
    const meta = raw?.meta ?? {
      current_page: Number(raw?.current_page ?? page),
      last_page: Number(raw?.last_page ?? 1),
      per_page: Number(raw?.per_page ?? list.length),
      total: Number(raw?.total ?? list.length),
      from: raw?.from,
      to: raw?.to,
    };
    return { list, meta };
  };

  const { list: agencies, meta } = normalizePagination(data);
  const currentPage = meta.current_page || page;
  const totalPages = meta.last_page || 1;
  const total = meta.total ?? agencies.length;

  const pageNumbers = (() => {
    const maxButtons = 9;
    const halfWindow = 4;
    if (totalPages <= maxButtons) return Array.from({ length: totalPages }, (_, i) => i + 1);
    let start = Math.max(1, currentPage - halfWindow);
    let end = start + maxButtons - 1;
    if (end > totalPages) {
      end = totalPages;
      start = end - maxButtons + 1;
    }
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  })();

  const handleDelete = async (agency: Agency) => {
    if (!confirm(`¿Eliminar la agencia ${agency.name}?`)) return;
    await agencyService.deleteAgency(agency.id);
    queryClient.invalidateQueries({ queryKey: ['agencies'] });
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content flex items-center gap-2">
            <BiBuilding className="w-7 h-7 text-primary" />
            Administrador de Agencias
          </h1>
          <p className="text-base-content/60">Lista y gestiona tus agencias, usuarios y credenciales.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/agencies/create')}>
          <BiPlus className="w-5 h-5" />
          Nueva agencia
        </button>
      </div>

      <div className="mb-5">
        <div className="card bg-base-100 shadow-sm border border-base-200">
          <div className="card-body py-3">
            <label className="label pb-1">
              <span className="label-text text-sm text-base-content/70">Buscar agencias</span>
            </label>
            <div className="relative w-full">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2 text-base-content/60">
                <BiSearch className="w-5 h-5" />
              </div>
              <input
                type="text"
                className="input input-bordered w-full pl-11 pr-4 rounded-full bg-base-100 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                placeholder="Buscar por nombre, NIT, correo o teléfono..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {agencies.length > 0 && (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4 bg-base-100 border border-base-200 rounded-xl px-4 py-3 shadow-sm">
          <div className="text-sm text-base-content/70">
            Página {currentPage} de {totalPages} • {total} agencias
          </div>
          <div className="join flex flex-wrap">
            <button
              className="btn join-item"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isFetching}
            >
              Anterior
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                className={`btn join-item ${p === currentPage ? 'btn-active' : ''}`}
                onClick={() => setPage(p)}
                disabled={isFetching}
              >
                {p}
              </button>
            ))}
            <button
              className="btn join-item"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isFetching}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <span className="loading loading-spinner loading-lg"></span>
        </div>
      ) : agencies.length === 0 ? (
        <div className="text-center py-16">
          <BiBuilding className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 className="text-lg font-semibold text-base-content/70">No hay agencias</h3>
          <p className="text-base-content/60">Crea tu primera agencia para empezar.</p>
        </div>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto bg-base-100 shadow rounded-xl border border-base-200">
            <table className="table w-full">
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
                {agencies.map((agency: Agency) => (
                  <tr key={agency.id} className="hover:bg-base-200/40">
                    <td className="font-semibold">{agency.name}</td>
                    <td>{agency.tax_id || '-'}</td>
                    <td>
                      <div className="text-sm">
                        {agency.email && <div>{agency.email}</div>}
                        {agency.phone && <div className="text-base-content/60">{agency.phone}</div>}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          agency.status === 'inactive' || agency.status === 0 ? 'badge-ghost' : 'badge-success'
                        }`}
                      >
                        {agency.status === 'inactive' || agency.status === 0 ? 'Inactiva' : 'Activa'}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/agencies/${agency.id}`)}>
                          <BiRightArrowAlt className="w-4 h-4" />
                          Detalle
                        </button>
                        <button className="btn btn-outline btn-sm btn-error" onClick={() => handleDelete(agency)}>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:hidden">
            {agencies.map((agency: Agency) => (
              <div key={agency.id} className="card bg-base-100 shadow-lg border border-base-200">
                <div className="card-body space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="card-title text-lg">{agency.name}</h3>
                      <p className="text-sm text-base-content/60">NIT: {agency.tax_id || '-'}</p>
                    </div>
                    <span
                      className={`badge ${
                        agency.status === 'inactive' || agency.status === 0 ? 'badge-ghost' : 'badge-success'
                      }`}
                    >
                      {agency.status === 'inactive' || agency.status === 0 ? 'Inactiva' : 'Activa'}
                    </span>
                  </div>
                  <div className="text-sm space-y-1">
                    {agency.email && <div className="font-medium">{agency.email}</div>}
                    {agency.phone && <div className="text-base-content/60">{agency.phone}</div>}
                  </div>
                  <div className="card-actions justify-end pt-2">
                    <button className="btn btn-outline btn-sm" onClick={() => navigate(`/agencies/${agency.id}`)}>
                      <BiRightArrowAlt className="w-4 h-4" />
                      Detalle
                    </button>
                    <button className="btn btn-outline btn-sm btn-error" onClick={() => handleDelete(agency)}>
                      <BiTrash className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {agencies.length > 0 && (
        <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-base-100 border border-base-200 rounded-xl px-4 py-3 shadow-sm">
          <div className="text-sm text-base-content/70">
            Página {currentPage} de {totalPages} • {total} agencias
          </div>
          <div className="join flex flex-wrap">
            <button
              className="btn join-item"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1 || isFetching}
            >
              Anterior
            </button>
            {pageNumbers.map((p) => (
              <button
                key={p}
                className={`btn join-item ${p === currentPage ? 'btn-active' : ''}`}
                onClick={() => setPage(p)}
                disabled={isFetching}
              >
                {p}
              </button>
            ))}
            <button
              className="btn join-item"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages || isFetching}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default AgenciesPage;
