import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BiDownload, BiGroup, BiPlus, BiRightArrowAlt, BiSearch, BiTrash, BiUpload } from 'react-icons/bi';
import * as XLSX from 'xlsx';
import { clientService } from '../../services/clientService';
import { companyService } from '../../services/companyService';
import type { Client } from '../../types/client';
import type { ClientContact } from '../../types/client';
import SearchableSelect from '../../components/ui/SearchableSelect';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-hot-toast';

type ImportableClientRow = {
  rowNumber: number;
  sourceRows: number[];
  payload: Partial<Client>;
  contacts: Partial<ClientContact>[];
  duplicateKey: string | null;
};

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
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importRows, setImportRows] = useState<ImportableClientRow[]>([]);
  const [importSummary, setImportSummary] = useState({
    totalRows: 0,
    validRows: 0,
    duplicatesInFile: 0,
    skippedByFormat: 0,
  });
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, page],
    queryFn: () => clientService.getClients({ search, page, per_page: 20 }),
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

  useEffect(() => {
    setPage(1);
  }, [search]);

  const normalizeText = (value: unknown) => String(value ?? '').trim();

  const normalizeHeader = (header: string) =>
    header
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_');

  const toDuplicateKey = (payload: Partial<Client>) => {
    const doc = normalizeText(payload.tax_id).toLowerCase();
    if (doc) return `doc:${doc}`;
    const email = normalizeText(payload.email).toLowerCase();
    if (email) return `email:${email}`;
    const fallback = `${normalizeText(payload.name).toLowerCase()}|${normalizeText(payload.phone).toLowerCase()}`;
    return fallback !== '|' ? `name_phone:${fallback}` : null;
  };

  const contactUniqueKey = (contact: Partial<ClientContact>) => {
    const email = normalizeText(contact.email).toLowerCase();
    if (email) return `email:${email}`;
    const fallback = `${normalizeText(contact.name).toLowerCase()}|${normalizeText(contact.phone).toLowerCase()}`;
    return fallback !== '|' ? `name_phone:${fallback}` : null;
  };

  const mergeContacts = (
    baseContacts: Partial<ClientContact>[],
    incomingContacts: Partial<ClientContact>[]
  ) => {
    const merged = [...baseContacts];
    const seen = new Set<string>();

    merged.forEach((contact) => {
      const key = contactUniqueKey(contact);
      if (key) seen.add(key);
    });

    incomingContacts.forEach((contact) => {
      const key = contactUniqueKey(contact);
      if (key && seen.has(key)) return;
      merged.push(contact);
      if (key) seen.add(key);
    });

    return merged;
  };

  const parseBoolean = (value: string) => {
    const normalized = normalizeText(value).toLowerCase();
    return ['1', 'true', 'si', 'sí', 'yes', 'y'].includes(normalized);
  };

  const parseContacts = (normalizedRow: Record<string, string>): Partial<ClientContact>[] => {
    const singleContact: Partial<ClientContact> = {
      name: normalizeText(normalizedRow.contacto_nombre),
      position: normalizeText(normalizedRow.contacto_cargo) || undefined,
      email: normalizeText(normalizedRow.contacto_correo) || undefined,
      phone: normalizeText(normalizedRow.contacto_telefono) || undefined,
      is_primary: parseBoolean(normalizedRow.contacto_principal || ''),
    };

    const hasSingleContactData = Boolean(
      normalizeText(singleContact.name) || normalizeText(singleContact.email) || normalizeText(singleContact.phone)
    );
    if (hasSingleContactData) {
      return [singleContact];
    }

    // Compatibilidad con plantillas anteriores: contacto_1_*, contacto_2_*, etc.
    const contactsByIndex = new Map<number, Partial<ClientContact>>();
    Object.entries(normalizedRow).forEach(([key, value]) => {
      const match = key.match(/^contacto_(\d+)_(nombre|cargo|correo|telefono|principal)$/);
      if (!match) return;
      const index = Number(match[1]);
      const field = match[2];
      const current = contactsByIndex.get(index) ?? {};
      if (field === 'nombre') current.name = normalizeText(value);
      if (field === 'cargo') current.position = normalizeText(value) || undefined;
      if (field === 'correo') current.email = normalizeText(value) || undefined;
      if (field === 'telefono') current.phone = normalizeText(value) || undefined;
      if (field === 'principal') current.is_primary = parseBoolean(value);
      contactsByIndex.set(index, current);
    });

    return Array.from(contactsByIndex.values()).filter(
      (contact) => normalizeText(contact.name) || normalizeText(contact.email) || normalizeText(contact.phone)
    );
  };

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

  const parseExcelFile = async (file: File) => {
    if (!resolvedImportCompanyId) {
      toast.error('Selecciona una compañía para la importación');
      return;
    }

    setIsParsingFile(true);
    setImportErrors([]);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      const parsedRowsMap = new Map<string, ImportableClientRow>();
      let skippedByFormat = 0;
      let consolidatedRows = 0;

      rawRows.forEach((row, index) => {
        const rowNumber = index + 2;
        const normalizedRow: Record<string, string> = {};
        Object.entries(row).forEach(([header, value]) => {
          normalizedRow[normalizeHeader(header)] = normalizeText(value);
        });

        const name = normalizedRow.nombre;
        if (!name) {
          skippedByFormat += 1;
          return;
        }

        const clientType = normalizedRow.tipo_cliente.toLowerCase() === 'person' ? 'person' : 'company';
        const payload: Partial<Client> = {
          company_id: resolvedImportCompanyId,
          client_type: clientType,
          name,
          document_type: normalizedRow.tipo_documento || undefined,
          tax_id: normalizedRow.numero_documento || undefined,
          email: normalizedRow.correo || undefined,
          phone: normalizedRow.telefono || undefined,
          address: normalizedRow.direccion || undefined,
          country_id: normalizedRow.pais_id ? Number(normalizedRow.pais_id) : undefined,
          state_id: normalizedRow.estado_id ? Number(normalizedRow.estado_id) : undefined,
          city_id: normalizedRow.ciudad_id ? Number(normalizedRow.ciudad_id) : undefined,
          client_category_id: normalizedRow.categoria_id ? Number(normalizedRow.categoria_id) : undefined,
          notes: normalizedRow.notas || undefined,
          status: 1,
        };

        const contacts = parseContacts(normalizedRow);
        const duplicateKey = toDuplicateKey(payload);

        const aggregateKey = duplicateKey ?? `row:${rowNumber}`;
        const existing = parsedRowsMap.get(aggregateKey);
        if (existing) {
          existing.sourceRows.push(rowNumber);
          existing.contacts = mergeContacts(existing.contacts, contacts);
          existing.payload = {
            ...existing.payload,
            document_type: existing.payload.document_type || payload.document_type,
            tax_id: existing.payload.tax_id || payload.tax_id,
            email: existing.payload.email || payload.email,
            phone: existing.payload.phone || payload.phone,
            address: existing.payload.address || payload.address,
            country_id: existing.payload.country_id || payload.country_id,
            state_id: existing.payload.state_id || payload.state_id,
            city_id: existing.payload.city_id || payload.city_id,
            client_category_id: existing.payload.client_category_id || payload.client_category_id,
            notes: existing.payload.notes || payload.notes,
          };
          consolidatedRows += 1;
          return;
        }

        parsedRowsMap.set(aggregateKey, {
          rowNumber,
          sourceRows: [rowNumber],
          payload,
          contacts,
          duplicateKey,
        });
      });

      const parsedRows = Array.from(parsedRowsMap.values());

      setImportRows(parsedRows);
      setImportSummary({
        totalRows: rawRows.length,
        validRows: parsedRows.length,
        duplicatesInFile: consolidatedRows,
        skippedByFormat,
      });
    } catch (error) {
      setImportRows([]);
      setImportSummary({ totalRows: 0, validRows: 0, duplicatesInFile: 0, skippedByFormat: 0 });
      setImportErrors(['No se pudo leer el archivo Excel. Verifica que sea .xlsx o .xls']);
    } finally {
      setIsParsingFile(false);
    }
  };

  const fetchExistingClientsMap = async (companyId: number) => {
    const byKey = new Map<string, Client>();
    let page = 1;
    let lastPage = 1;

    do {
      const response = await clientService.getClients({ company_id: companyId, per_page: 200, page });
      response.data.forEach((item) => {
        const key = toDuplicateKey(item);
        if (key) byKey.set(key, item);
      });
      lastPage = response.meta?.last_page ?? 1;
      page += 1;
    } while (page <= lastPage);

    return byKey;
  };

  const handleImportClients = async () => {
    if (!resolvedImportCompanyId) {
      toast.error('Selecciona una compañía para importar');
      return;
    }
    if (importRows.length === 0) {
      toast.error('Primero carga un archivo con filas válidas');
      return;
    }

    setIsImporting(true);
    setImportErrors([]);
    try {
      const existingClientsByKey = await fetchExistingClientsMap(resolvedImportCompanyId);
      const cachedClientContactKeys = new Map<number, Set<string>>();
      let createdClientsCount = 0;
      let reusedClientsCount = 0;
      let createdContactsCount = 0;
      let skippedExistingContacts = 0;
      const rowErrors: string[] = [];

      for (const row of importRows) {
        try {
          let targetClient: Client | null = row.duplicateKey ? existingClientsByKey.get(row.duplicateKey) ?? null : null;
          if (!targetClient) {
            targetClient = await clientService.createClient({
              ...row.payload,
              company_id: resolvedImportCompanyId,
            });
            createdClientsCount += 1;
            if (row.duplicateKey) {
              existingClientsByKey.set(row.duplicateKey, targetClient);
            }
          } else {
            reusedClientsCount += 1;
          }
          if (!targetClient) {
            throw new Error('No fue posible determinar el cliente destino');
          }

          const contactsToCreate = row.contacts.length > 0
            ? row.contacts
            : row.payload.client_type === 'person'
              ? [{
                  name: row.payload.name || '',
                  email: row.payload.email || undefined,
                  phone: row.payload.phone || undefined,
                  is_primary: true,
                }]
              : [];

          let existingContactKeys = cachedClientContactKeys.get(targetClient.id);
          if (!existingContactKeys) {
            existingContactKeys = new Set<string>();
            const existingContacts = await clientService.getContacts(targetClient.id);
            existingContacts.forEach((contact) => {
              const key = contactUniqueKey(contact);
              if (key) existingContactKeys?.add(key);
            });
            cachedClientContactKeys.set(targetClient.id, existingContactKeys);
          }

          for (const contact of contactsToCreate) {
            if (!normalizeText(contact.name)) continue;
            const key = contactUniqueKey(contact);
            if (key && existingContactKeys.has(key)) {
              skippedExistingContacts += 1;
              continue;
            }
            await clientService.createContact(targetClient.id, {
              name: normalizeText(contact.name),
              position: normalizeText(contact.position) || undefined,
              email: normalizeText(contact.email) || undefined,
              phone: normalizeText(contact.phone) || undefined,
              is_primary: Boolean(contact.is_primary),
            });
            if (key) existingContactKeys.add(key);
            createdContactsCount += 1;
          }
        } catch (error: any) {
          const message = error?.response?.data?.message || 'Error desconocido';
          rowErrors.push(`Fila ${row.sourceRows.join(', ')}: ${message}`);
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(
        `Importación finalizada. Clientes nuevos: ${createdClientsCount}. Clientes reutilizados: ${reusedClientsCount}. ` +
        `Contactos creados: ${createdContactsCount}. Contactos existentes omitidos: ${skippedExistingContacts}.`
      );
      setImportErrors(rowErrors);
    } finally {
      setIsImporting(false);
    }
  };

  const handleDelete = async (client: Client) => {
    if (!window.confirm(`¿Eliminar el cliente ${client.name}?`)) return;
    await clientService.deleteClient(client.id);
    queryClient.invalidateQueries({ queryKey: ['clients'] });
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

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 rounded-2xl border border-base-200 bg-base-100 px-4 py-3 md:flex-row md:items-center md:justify-between">
              <div className="text-sm text-base-content/70">
                Página {currentPage} de {totalPages} · {totalClients} clientes
              </div>
              <div className="join">
                <button
                  type="button"
                  className="btn btn-sm join-item"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  Anterior
                </button>
                <button type="button" className="btn btn-sm join-item pointer-events-none">
                  {currentPage}
                </button>
                <button
                  type="button"
                  className="btn btn-sm join-item"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
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
                <span className="label-text mb-2">Archivo Excel (.xlsx / .xls)</span>
                <input
                  type="file"
                  className="file-input file-input-bordered w-full"
                  accept=".xlsx,.xls"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void parseExcelFile(file);
                  }}
                />
              </label>
            </div>

            <div className="mt-4 rounded-2xl border border-base-200 bg-base-50 p-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <div>
                  <div className="text-xs text-base-content/60">Filas leídas</div>
                  <div className="text-xl font-semibold">{importSummary.totalRows}</div>
                </div>
                <div>
                  <div className="text-xs text-base-content/60">Filas válidas</div>
                  <div className="text-xl font-semibold">{importSummary.validRows}</div>
                </div>
                <div>
                  <div className="text-xs text-base-content/60">Filas consolidadas</div>
                  <div className="text-xl font-semibold">{importSummary.duplicatesInFile}</div>
                </div>
                <div>
                  <div className="text-xs text-base-content/60">Inválidas</div>
                  <div className="text-xl font-semibold">{importSummary.skippedByFormat}</div>
                </div>
              </div>
              {isParsingFile && <div className="mt-3 text-sm text-base-content/70">Procesando archivo...</div>}
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
                  setImportRows([]);
                  setImportErrors([]);
                  setImportSummary({ totalRows: 0, validRows: 0, duplicatesInFile: 0, skippedByFormat: 0 });
                }}
                disabled={isImporting}
              >
                Cerrar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleImportClients}
                disabled={isImporting || isParsingFile || importRows.length === 0}
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
