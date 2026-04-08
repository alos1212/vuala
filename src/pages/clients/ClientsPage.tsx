import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BiDownload, BiGroup, BiPlus, BiRightArrowAlt, BiSearch, BiTrash, BiUpload } from 'react-icons/bi';
import * as XLSX from 'xlsx';
import { clientService } from '../../services/clientService';
import { companyService } from '../../services/companyService';
import { geoService } from '../../services/geoService';
import type { Client } from '../../types/client';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-hot-toast';

const ClientsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const user = useAuthStore((state) => state.user);
  const canCreateClients = hasPermission('clients.create');
  const canListCompanies = hasPermission('companies.list');
  const userCompanyId = Number(user?.company_id) || undefined;
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedImportCompanyId, setSelectedImportCompanyId] = useState<number | null>(userCompanyId ?? null);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedStateId, setSelectedStateId] = useState<number | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [importSummary, setImportSummary] = useState<{
    total_rows: number;
    valid_rows: number;
    consolidated_rows: number;
    skipped_by_format: number;
    created_clients: number;
    reused_clients: number;
    created_contacts: number;
    skipped_existing_contacts: number;
    errors: string[];
  } | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, page, selectedCountryId, selectedStateId, selectedCityId],
    queryFn: () => clientService.getClients({
      search,
      page,
      per_page: 20,
      country_id: selectedCountryId ?? undefined,
      state_id: selectedStateId ?? undefined,
      city_id: selectedCityId ?? undefined,
    }),
  });
  const { data: countries = [] } = useQuery({
    queryKey: ['geo-countries'],
    queryFn: geoService.getCountries,
  });
  const { data: states = [], isFetched: isStatesFetched } = useQuery({
    queryKey: ['geo-states', selectedCountryId],
    queryFn: () => geoService.getStatesByCountry(selectedCountryId as number),
    enabled: Boolean(selectedCountryId),
  });
  const { data: cities = [], isFetched: isCitiesFetched } = useQuery({
    queryKey: ['geo-cities', selectedStateId],
    queryFn: () => geoService.getCitiesByState(selectedStateId as number),
    enabled: Boolean(selectedStateId),
  });
  const { data: companiesData } = useQuery({
    queryKey: ['companies-for-client-import'],
    queryFn: () => companyService.getCompanies({ per_page: 200 }),
    enabled: canListCompanies,
  });

  const clients = data?.data ?? [];
  const currentPage = data?.meta?.current_page ?? page;
  const totalPages = data?.meta?.last_page ?? 1;
  const totalClients = data?.meta?.total ?? clients.length;
  const importCompanyOptions = (companiesData?.data ?? []).map((company) => ({ value: company.id, label: company.name }));
  const resolvedImportCompanyId = selectedImportCompanyId ?? userCompanyId ?? null;
  const pageGroupSize = 10;
  const halfWindow = Math.floor(pageGroupSize / 2);
  let pageStart = Math.max(1, currentPage - halfWindow);
  let pageEnd = Math.min(totalPages, pageStart + pageGroupSize - 1);
  if (pageEnd - pageStart + 1 < pageGroupSize) {
    pageStart = Math.max(1, pageEnd - pageGroupSize + 1);
  }
  const visiblePages = Array.from(
    { length: Math.max(0, pageEnd - pageStart + 1) },
    (_, index) => pageStart + index
  );

  useEffect(() => {
    setPage(1);
  }, [search, selectedCountryId, selectedStateId, selectedCityId]);

  useEffect(() => {
    if (!selectedCountryId) {
      setSelectedStateId(null);
      setSelectedCityId(null);
      return;
    }

    if (isStatesFetched && selectedStateId && !states.some((state) => state.id === selectedStateId)) {
      setSelectedStateId(null);
      setSelectedCityId(null);
    }
  }, [isStatesFetched, selectedCountryId, selectedStateId, states]);

  useEffect(() => {
    if (!selectedStateId) {
      setSelectedCityId(null);
      return;
    }

    if (isCitiesFetched && selectedCityId && !cities.some((city) => city.id === selectedCityId)) {
      setSelectedCityId(null);
    }
  }, [cities, isCitiesFetched, selectedCityId, selectedStateId]);

  const downloadTemplate = () => {
    const templateRows = [
      {
        tipo_cliente: 'company',
        nombre: 'Cliente Demo SAS',
        tipo_documento: 'NIT',
        numero_documento: '900123456',
        correo: 'demo@cliente.com',
        telefono: '3000000000',
        direccion: 'Calle 1 # 2-3',
        pais_id: '',
        estado_id: '',
        ciudad_id: '',
        categoria_id: '',
        notas: 'Cliente importado por plantilla',
        contacto_nombre: 'Ana Contacto',
        contacto_cargo: 'Compras',
        contacto_correo: 'ana@cliente.com',
        contacto_telefono: '3111111111',
        contacto_principal: 'si',
      },
      {
        tipo_cliente: 'company',
        nombre: 'Cliente Demo SAS',
        tipo_documento: 'NIT',
        numero_documento: '900123456',
        correo: 'demo@cliente.com',
        telefono: '3000000000',
        direccion: 'Calle 1 # 2-3',
        pais_id: '',
        estado_id: '',
        ciudad_id: '',
        categoria_id: '',
        notas: 'Misma empresa, contacto adicional',
        contacto_nombre: 'Luis Contacto',
        contacto_cargo: 'Finanzas',
        contacto_correo: 'luis@cliente.com',
        contacto_telefono: '3222222222',
        contacto_principal: 'no',
      }
    ];

    const guideRows = [
      { campo: 'tipo_cliente', descripcion: 'Valores: company o person', obligatorio: 'si' },
      { campo: 'nombre', descripcion: 'Nombre del cliente', obligatorio: 'si' },
      { campo: 'tipo_documento', descripcion: 'Empresa: NIT/RUT/EIN/TAX_ID. Persona: CC/CE/TI/RC/PP/PPT/DNI', obligatorio: 'no' },
      { campo: 'numero_documento', descripcion: 'Documento del cliente', obligatorio: 'no' },
      { campo: 'correo', descripcion: 'Correo del cliente', obligatorio: 'no' },
      { campo: 'telefono', descripcion: 'Teléfono del cliente', obligatorio: 'no' },
      { campo: 'direccion', descripcion: 'Dirección', obligatorio: 'no' },
      { campo: 'pais_id', descripcion: 'ID del país', obligatorio: 'no' },
      { campo: 'estado_id', descripcion: 'ID del estado', obligatorio: 'no' },
      { campo: 'ciudad_id', descripcion: 'ID de la ciudad', obligatorio: 'no' },
      { campo: 'categoria_id', descripcion: 'ID de categoría de cliente', obligatorio: 'no' },
      { campo: 'notas', descripcion: 'Notas del cliente', obligatorio: 'no' },
      { campo: 'contacto_nombre', descripcion: 'Nombre del contacto de esta fila', obligatorio: 'no' },
      { campo: 'contacto_cargo', descripcion: 'Cargo del contacto', obligatorio: 'no' },
      { campo: 'contacto_correo', descripcion: 'Correo del contacto (clave para no repetir)', obligatorio: 'no' },
      { campo: 'contacto_telefono', descripcion: 'Teléfono del contacto', obligatorio: 'no' },
      { campo: 'contacto_principal', descripcion: 'si/no', obligatorio: 'no' },
      { campo: 'regla_multi_contacto', descripcion: 'Para varios contactos del mismo cliente, repite la fila con mismo cliente y contacto diferente', obligatorio: 'si' },
    ];

    const workbook = XLSX.utils.book_new();
    const templateSheet = XLSX.utils.json_to_sheet(templateRows);
    const guideSheet = XLSX.utils.json_to_sheet(guideRows);
    XLSX.utils.book_append_sheet(workbook, templateSheet, 'Plantilla');
    XLSX.utils.book_append_sheet(workbook, guideSheet, 'Guia');
    XLSX.writeFile(workbook, 'plantilla_carga_clientes.xlsx');
  };

  const handleImportClients = async () => {
    if (!resolvedImportCompanyId) {
      toast.error('Selecciona una compañía para importar');
      return;
    }
    if (!importFile) {
      toast.error('Selecciona un archivo para importar');
      return;
    }

    setIsImporting(true);
    setImportErrors([]);
    try {
      const result = await clientService.importClients(importFile, resolvedImportCompanyId);
      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      setImportSummary(result);
      setImportErrors(result.errors || []);
      toast.success('Importación finalizada en servidor');
      setImportFile(null);
      const fileInput = document.getElementById('clients-import-file-input') as HTMLInputElement | null;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      const message = error?.response?.data?.message || 'No se pudo importar el archivo';
      const backendErrors = error?.response?.data?.errors;
      const lines = backendErrors
        ? Object.values(backendErrors).flat().map((item) => String(item))
        : [message];
      setImportErrors(lines);
      toast.error(message);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (!window.confirm(`¿Eliminar el cliente ${client.name}?`)) return;
    await clientService.deleteClient(client.id);
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  const renderPagination = (keyPrefix: string) => {
    if (totalPages <= 1) return null;

    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-base-200 bg-base-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-base-content/70">
          Página {currentPage} de {totalPages} · {totalClients} clientes
        </div>
        <div className="join flex-wrap">
          <button
            type="button"
            className="btn btn-sm join-item"
            disabled={currentPage <= 1}
            onClick={() => setPage(1)}
          >
            «
          </button>
          <button
            type="button"
            className="btn btn-sm join-item"
            disabled={currentPage <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            Anterior
          </button>

          {pageStart > 1 && (
            <button type="button" className="btn btn-sm join-item pointer-events-none">
              ...
            </button>
          )}

          {visiblePages.map((pageNumber) => (
            <button
              key={`${keyPrefix}-page-${pageNumber}`}
              type="button"
              className={`btn btn-sm join-item ${pageNumber === currentPage ? 'btn-primary' : ''}`}
              onClick={() => setPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}

          {pageEnd < totalPages && (
            <button type="button" className="btn btn-sm join-item pointer-events-none">
              ...
            </button>
          )}

          <button
            type="button"
            className="btn btn-sm join-item"
            disabled={currentPage >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Siguiente
          </button>
          <button
            type="button"
            className="btn btn-sm join-item"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(totalPages)}
          >
            »
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <BiGroup className="w-7 h-7 text-primary" />
            Clientes
          </h1>
          <p className="text-base-content/60">Gestiona los clientes de las compañías y sus datos de contacto.</p>
        </div>
        <div className="flex items-center gap-2">
          {canCreateClients && (
            <button className="btn btn-outline" onClick={() => setIsImportModalOpen(true)}>
              <BiUpload className="w-5 h-5" />
              Carga masiva
            </button>
          )}
          <button className="btn btn-primary" onClick={() => navigate('/clients/create')}>
            <BiPlus className="w-5 h-5" />
            Nuevo cliente
          </button>
        </div>
      </div>

      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body">
          <div className="relative">
            <BiSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-base-content/50" />
            <input
              className="input input-bordered w-full pl-12"
              placeholder="Buscar cliente por nombre, NIT, correo o teléfono"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="form-control w-full">
              <span className="label-text mb-2">País</span>
              <SearchableSelect
                options={countries.map((country) => ({ value: country.id, label: country.name }))}
                value={selectedCountryId}
                onChange={(value) => setSelectedCountryId(value ? Number(value) : null)}
                placeholder="Todos los países"
                isClearable
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-2">Estado</span>
              <SearchableSelect
                options={states.map((state) => ({ value: state.id, label: state.name }))}
                value={selectedStateId}
                onChange={(value) => setSelectedStateId(value ? Number(value) : null)}
                placeholder={selectedCountryId ? 'Todos los estados' : 'Primero selecciona un país'}
                isDisabled={!selectedCountryId}
                isClearable
              />
            </label>
            <label className="form-control w-full">
              <span className="label-text mb-2">Ciudad</span>
              <SearchableSelect
                options={cities.map((city) => ({ value: city.id, label: city.name }))}
                value={selectedCityId}
                onChange={(value) => setSelectedCityId(value ? Number(value) : null)}
                placeholder={selectedStateId ? 'Todas las ciudades' : 'Primero selecciona un estado'}
                isDisabled={!selectedStateId}
                isClearable
              />
            </label>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center"><span className="loading loading-spinner loading-lg" /></div>
      ) : clients.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-base-300 p-10 text-center text-base-content/60">
          No hay clientes registrados.
        </div>
      ) : (
        <>
          {renderPagination('top')}

          <div className="overflow-x-auto rounded-3xl border border-base-200 bg-base-100 shadow">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Documento</th>
                  <th>Compañía</th>
                  <th>Asignado a</th>
                  <th>Contacto</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td className="font-semibold">{client.name}</td>
                    <td>
                      <span className={`badge ${client.client_type === 'person' ? 'badge-info' : 'badge-secondary'}`}>
                        {client.client_type === 'person' ? 'Persona' : 'Empresa'}
                      </span>
                    </td>
                    <td>{client.category?.name || '-'}</td>
                    <td>{[client.document_type, client.tax_id].filter(Boolean).join(' ') || '-'}</td>
                    <td>{client.company?.name || `#${client.company_id}`}</td>
                    <td>{client.assignedUser?.name || '-'}</td>
                    <td>
                      <div className="text-sm">
                        <div>{client.email || '-'}</div>
                        <div className="text-base-content/60">{client.phone || '-'}</div>
                      </div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-2">
                        <button className="btn btn-outline btn-sm" onClick={() => navigate(`/clients/${client.id}`)}>
                          <BiRightArrowAlt className="w-4 h-4" />
                          Detalle
                        </button>
                        <button className="btn btn-outline btn-sm btn-error" onClick={() => handleDelete(client)}>
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

          {renderPagination('bottom')}
        </>
      )}

      {isImportModalOpen && typeof document !== 'undefined' && createPortal(
        <div className="modal modal-open">
          <div className="modal-box max-w-4xl">
            <h3 className="text-xl font-bold">Carga masiva de clientes</h3>
            <p className="mt-1 text-sm text-base-content/60">
              Descarga la plantilla, completa la información y sube el archivo. Si un cliente tiene varios contactos, repite filas con el mismo cliente y contacto diferente.
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="form-control w-full">
                <span className="label-text mb-2">Compañía destino</span>
                {canListCompanies ? (
                  <SearchableSelect
                    options={importCompanyOptions}
                    value={selectedImportCompanyId}
                    onChange={(value) => setSelectedImportCompanyId(value ? Number(value) : null)}
                    placeholder="Selecciona una compañía"
                    isClearable={false}
                  />
                ) : (
                  <input
                    className="input input-bordered w-full bg-base-200"
                    value={user?.company?.name || `Compañía #${userCompanyId ?? ''}`}
                    readOnly
                    disabled
                  />
                )}
              </label>
              <div className="flex items-end">
                <button type="button" className="btn btn-outline w-full" onClick={downloadTemplate}>
                  <BiDownload className="w-5 h-5" />
                  Descargar plantilla guía
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="form-control w-full">
                <span className="label-text mb-2">Archivo Excel/CSV (.xlsx / .xls / .csv)</span>
                <input
                  id="clients-import-file-input"
                  type="file"
                  className="file-input file-input-bordered w-full"
                  accept=".xlsx,.xls,.csv"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    setImportFile(file ?? null);
                    setImportErrors([]);
                    setImportSummary(null);
                  }}
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-base-200 bg-base-50 p-4">
              {importFile && (
                <div className="mb-3 text-sm text-base-content/70">
                  Archivo seleccionado: <span className="font-semibold">{importFile.name}</span>
                </div>
              )}
              {importSummary && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div>
                    <div className="text-xs text-base-content/60">Filas leídas</div>
                    <div className="text-xl font-semibold">{importSummary.total_rows}</div>
                  </div>
                  <div>
                    <div className="text-xs text-base-content/60">Filas válidas</div>
                    <div className="text-xl font-semibold">{importSummary.valid_rows}</div>
                  </div>
                  <div>
                    <div className="text-xs text-base-content/60">Clientes nuevos</div>
                    <div className="text-xl font-semibold">{importSummary.created_clients}</div>
                  </div>
                  <div>
                    <div className="text-xs text-base-content/60">Contactos nuevos</div>
                    <div className="text-xl font-semibold">{importSummary.created_contacts}</div>
                  </div>
                </div>
              )}
              {importErrors.length > 0 && (
                <div className="mt-3 rounded-xl border border-error/20 bg-error/10 p-3 text-sm text-error max-h-40 overflow-auto">
                  {importErrors.map((error) => (
                    <div key={error}>{error}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-action">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportErrors([]);
                  setImportSummary(null);
                }}
                disabled={isImporting}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImportClients}
                disabled={isImporting || !importFile}
              >
                {isImporting ? 'Importando...' : 'Importar clientes'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => !isImporting && setIsImportModalOpen(false)} />
        </div>,
        document.body
      )}
    </div>
  );
};

export default ClientsPage;
