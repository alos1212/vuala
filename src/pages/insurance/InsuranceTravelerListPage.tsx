import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DateRangePicker } from "react-date-range";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { insurancePurchaseService } from "../../services/insurancePurchaseService";
import type { InsuranceTravelerListItem } from "../../types/insurancePurchaseList";
import type { PaginatedResponse } from "../../types/api";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

const formatRangeLabel = (start?: Date | null, end?: Date | null) => {
  if (!start && !end) return "Seleccionar rango";
  if (start && end) return `${format(start, "dd/MM/yyyy")} - ${format(end, "dd/MM/yyyy")}`;
  if (start) return `${format(start, "dd/MM/yyyy")} - ...`;
  if (end) return `... - ${format(end, "dd/MM/yyyy")}`;
  return "Seleccionar rango";
};

const toParamDate = (date?: Date | null) => (date ? format(date, "yyyy-MM-dd") : undefined);

const rangeColor = "rgb(var(--p))";
const pickerHideStyles = `
.traveler-picker .rdrDefinedRangesWrapper {
  display: none !important;
}
`;

const InsuranceTravelerListPage: React.FC = () => {
  const navigate = useNavigate();
  const [purchaseId, setPurchaseId] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [departureRange, setDepartureRange] = useState<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });
  const [emissionRange, setEmissionRange] = useState<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [showEmissionPicker, setShowEmissionPicker] = useState(false);
  const [data, setData] = useState<InsuranceTravelerListItem[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<InsuranceTravelerListItem>["meta"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const buildFilters = useCallback(
    (pageOverride?: number) => ({
      purchase_id: purchaseId.trim() || undefined,
      document_number: documentNumber.trim() || undefined,
      departure_from: toParamDate(departureRange.startDate),
      departure_to: toParamDate(departureRange.endDate),
      emission_from: toParamDate(emissionRange.startDate),
      emission_to: toParamDate(emissionRange.endDate),
      listing: "approved",
      page: pageOverride ?? page,
    }),
    [purchaseId, documentNumber, departureRange, emissionRange, page],
  );

  const loadData = useCallback(
    async (pageOverride?: number) => {
      try {
        window.dispatchEvent(new CustomEvent('loader:start'));
        setLoading(true);
        setError(null);
        const response = await insurancePurchaseService.listTravelers(buildFilters(pageOverride));
        setData(response.data);
        setMeta(response.meta);
        if (pageOverride) setPage(pageOverride);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los pasajeros.");
      } finally {
        setLoading(false);
        window.dispatchEvent(new CustomEvent('loader:end'));
      }
    },
    [buildFilters],
  );

  useEffect(() => {
    loadData(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    loadData(1);
  };

  const totalPages = useMemo(() => meta?.last_page ?? 1, [meta]);
  const currentPage = meta?.current_page ?? page;

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) return;
    loadData(nextPage);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <style>{pickerHideStyles}</style>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--color-secondary)]">Listado de pasajeros</h1>
        <div className="text-sm text-gray-500">Total registros: {meta?.total ?? 0}</div>
      </div>

      <form className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 space-y-4" onSubmit={handleSearch}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-[var(--color-secondary)]">ID Compra</span>
            <input className="input input-bordered h-11 rounded-2xl" value={purchaseId} onChange={(e) => setPurchaseId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-[var(--color-secondary)]">Documento</span>
            <input className="input input-bordered h-11 rounded-2xl" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-[var(--color-secondary)]">Rango salida</span>
            <button type="button" className="btn btn-outline h-11 rounded-2xl justify-between" onClick={() => setShowDeparturePicker(true)}>
              {formatRangeLabel(departureRange.startDate, departureRange.endDate)}
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-[var(--color-secondary)]">Rango emisión</span>
            <button type="button" className="btn btn-outline h-11 rounded-2xl justify-between" onClick={() => setShowEmissionPicker(true)}>
              {formatRangeLabel(emissionRange.startDate, emissionRange.endDate)}
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3 justify-end">
          <button type="button" className="btn btn-ghost" onClick={() => {
            setPurchaseId("");
            setDocumentNumber("");
            setDepartureRange({ startDate: null, endDate: null });
            setEmissionRange({ startDate: null, endDate: null });
            loadData(1);
          }}>
            Limpiar
          </button>
          <button type="submit" className={`btn btn-primary rounded-full px-6 ${loading ? "loading" : ""}`}>Buscar</button>
        </div>
      </form>

      {error && (
        <div className="alert alert-error rounded-2xl">
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr className="text-xs text-gray-500 uppercase">
                <th>ID</th>
                <th>Nombre</th>
                <th>Documento</th>
                <th>Plan</th>
                <th>Salida</th>
                <th>Email</th>
                <th>Anulado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10">
                    <span className="loading loading-spinner loading-lg text-primary" />
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-sm text-gray-500">No hay resultados</td>
                </tr>
              ) : (
                data.map((item) => {
                  const isCanceled = item.canceled === true || item.canceled === 1;
                  return (
                    <tr key={item.id} className={isCanceled ? "bg-red-50" : undefined}>
                      <td>{item.id}</td>
                      <td>{`${item.first_name ?? "-"} ${item.last_name ?? ""}`}</td>
                      <td>{item.document_number ?? "-"}</td>
                      <td>{item.plan_name ?? "-"}</td>
                      <td>{item.start_date ? format(new Date(item.start_date), "dd/MM/yyyy") : "-"}</td>
                      <td>{item.email ?? "-"}</td>
                      <td>{isCanceled ? "Sí" : "No"}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline btn-xs rounded-full"
                          onClick={() => navigate(`/insurance/travelers/${item.id}`)}
                        >
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <span className="text-sm text-gray-500">Página {currentPage} de {totalPages}</span>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}>
              Anterior
            </button>
            <button className="btn btn-sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= totalPages}>
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {showDeparturePicker && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDeparturePicker(false)}>
          <div className="bg-white rounded-3xl p-4 traveler-picker" onClick={(e) => e.stopPropagation()}>
            <DateRangePicker
              onChange={(ranges) => {
                const selection = ranges.selection;
                setDepartureRange({ startDate: selection.startDate ?? null, endDate: selection.endDate ?? null });
              }}
              moveRangeOnFirstSelection={false}
              months={1}
              direction="horizontal"
              locale={es}
              rangeColors={[rangeColor]}
              ranges={[{
                startDate: departureRange.startDate ?? new Date(),
                endDate: departureRange.endDate ?? departureRange.startDate ?? new Date(),
                key: "selection",
              }]}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button className="btn btn-ghost" onClick={() => {
                setDepartureRange({ startDate: null, endDate: null });
                setShowDeparturePicker(false);
              }}>Limpiar</button>
              <button className="btn btn-primary" onClick={() => setShowDeparturePicker(false)}>Aplicar</button>
            </div>
          </div>
        </div>
      )}

      {showEmissionPicker && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowEmissionPicker(false)}>
          <div className="bg-white rounded-3xl p-4 traveler-picker" onClick={(e) => e.stopPropagation()}>
            <DateRangePicker
              onChange={(ranges) => {
                const selection = ranges.selection;
                setEmissionRange({ startDate: selection.startDate ?? null, endDate: selection.endDate ?? null });
              }}
              moveRangeOnFirstSelection={false}
              months={1}
              direction="horizontal"
              locale={es}
              rangeColors={[rangeColor]}
              ranges={[{
                startDate: emissionRange.startDate ?? new Date(),
                endDate: emissionRange.endDate ?? emissionRange.startDate ?? new Date(),
                key: "selection",
              }]}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button className="btn btn-ghost" onClick={() => {
                setEmissionRange({ startDate: null, endDate: null });
                setShowEmissionPicker(false);
              }}>Limpiar</button>
              <button className="btn btn-primary" onClick={() => setShowEmissionPicker(false)}>Aplicar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InsuranceTravelerListPage;
