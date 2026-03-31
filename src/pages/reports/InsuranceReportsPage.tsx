import React, { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { reportService, type TravelerReportParams } from "../../services/reportService";
import { agencyService } from "../../services/agencyService";
import { useAuthStore } from "../../stores/authStore";
import type { Agency } from "../../types/agency";
import type { InsuranceTravelerReportRow, InsuranceTravelerReportResponse } from "../../types/insuranceReport";

type TabKey = "international" | "national" | "canceled";

const defaultParams: TravelerReportParams = {
  type: "international",
  status: "active",
  per_page: 50,
  page: 1,
};

const InsuranceReportsPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const isAgencyUser = Boolean(
    user?.agency_id ||
    (Array.isArray(user?.role)
      ? user.role.some((role) => role?.type === 1)
      : (user as any)?.role?.type === 1)
  );
  const userAgencyId = user?.agency_id != null ? String(user.agency_id) : "";

  const [params, setParams] = useState<TravelerReportParams>(() => ({
    ...defaultParams,
    agency: isAgencyUser ? (userAgencyId || undefined) : undefined,
  }));
  // refreshKey fuerza un refetch aunque los filtros no cambien
  const [refreshKey, setRefreshKey] = useState(0);
  const [filters, setFilters] = useState(() => ({
    voucher: "",
    document: "",
    first_name: "",
    last_name: "",
    agency: isAgencyUser ? userAgencyId : "",
    issued_from: "",
    issued_to: "",
    departure_from: "",
    departure_to: "",
    canceled_from: "",
    canceled_to: "",
  }));

  useEffect(() => {
    if (!isAgencyUser) return;
    setFilters((prev) => (prev.agency === userAgencyId ? prev : { ...prev, agency: userAgencyId }));
    setParams((prev) => (prev.agency === userAgencyId ? prev : { ...prev, agency: userAgencyId, page: 1 }));
  }, [isAgencyUser, userAgencyId]);

  const effectiveParams = useMemo<TravelerReportParams>(() => {
    if (!isAgencyUser) return params;
    return {
      ...params,
      agency: userAgencyId || undefined,
    };
  }, [params, isAgencyUser, userAgencyId]);

  const { data, isFetching, refetch } = useQuery<InsuranceTravelerReportResponse>({
    queryKey: ["insurance-reports", effectiveParams, refreshKey],
    queryFn: () => reportService.getInsuranceTravelers(effectiveParams),
    placeholderData: keepPreviousData,
  });

  // Fuerza un refetch explícito cada vez que se incrementa refreshKey
  useEffect(() => {
    refetch();
  }, [refreshKey, refetch]);

  const { data: agenciesResp = [] } = useQuery<Agency[]>({
    queryKey: ["agencies-all"],
    queryFn: () => agencyService.getAgencies(),
    enabled: !isAgencyUser,
  });
  const agencies: Agency[] = agenciesResp || [];

  const rows: InsuranceTravelerReportRow[] = (data?.data?.data as InsuranceTravelerReportRow[]) ?? [];
  const pagination = data?.data;

  const handleTabChange = (tab: TabKey) => {
    setParams((prev) => ({
      ...prev,
      type: tab === "national" ? "national" : "international",
      status: tab === "canceled" ? "canceled" : "active",
      page: 1,
    }));
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedAgency = isAgencyUser ? userAgencyId : filters.agency;
    setParams((prev) => ({
      ...prev,
      ...filters,
      agency: selectedAgency || undefined,
      status: prev.status, // keep status from tab
      type: prev.type,
      page: 1,
    }));
    // Asegura que se dispare la consulta aunque los filtros no cambien
    setRefreshKey((key) => key + 1);
  };

  const handlePageChange = (nextPage: number) => {
    setParams((prev) => ({ ...prev, page: nextPage }));
  };

  const currentTab: TabKey = useMemo(() => {
    if (params.status === "canceled") return "canceled";
    return params.type === "national" ? "national" : "international";
  }, [params.status, params.type]);

  const exportExcel = async () => {
    const { blob, filename } = await reportService.exportInsuranceTravelers(effectiveParams);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "reporte_seguros.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">Reportes de Seguros</h1>
          <p className="text-sm text-gray-500">Listado de emisiones y anulaciones por viajero.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="join shadow">
            <button
              className={`btn join-item ${currentTab === "international" ? "btn-primary text-white" : "btn-outline"}`}
              onClick={() => handleTabChange("international")}
            >
              Internacional
            </button>
            <button
              className={`btn join-item ${currentTab === "national" ? "btn-primary text-white" : "btn-outline"}`}
              onClick={() => handleTabChange("national")}
            >
              Nacional
            </button>
            <button
              className={`btn join-item ${currentTab === "canceled" ? "btn-primary text-white" : "btn-outline"}`}
              onClick={() => handleTabChange("canceled")}
            >
              Anulaciones
            </button>
          </div>
          <button className="btn btn-outline" onClick={exportExcel} disabled={!rows.length}>
            Exportar Excel
          </button>
        </div>
      </div>

      <form className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-base-100 rounded-xl p-4 shadow" onSubmit={handleFilterSubmit}>
        <div>
          <label className="label text-sm">Voucher</label>
          <input
            className="input input-bordered w-full"
            value={filters.voucher}
            onChange={(e) => setFilters({ ...filters, voucher: e.target.value })}
            placeholder="Buscar por voucher"
          />
        </div>
        <div>
          <label className="label text-sm">Documento</label>
          <input
            className="input input-bordered w-full"
            value={filters.document}
            onChange={(e) => setFilters({ ...filters, document: e.target.value })}
            placeholder="Número de documento"
          />
        </div>
        <div>
          <label className="label text-sm">Nombre</label>
          <input
            className="input input-bordered w-full"
            value={filters.first_name}
            onChange={(e) => setFilters({ ...filters, first_name: e.target.value })}
            placeholder="Nombre"
          />
        </div>
        <div>
          <label className="label text-sm">Apellido</label>
          <input
            className="input input-bordered w-full"
            value={filters.last_name}
            onChange={(e) => setFilters({ ...filters, last_name: e.target.value })}
            placeholder="Apellido"
          />
        </div>
        {!isAgencyUser && (
          <div>
            <label className="label text-sm">Agencia</label>
            <select
              className="select select-bordered w-full"
              value={filters.agency}
              onChange={(e) => setFilters({ ...filters, agency: e.target.value })}
            >
              <option value="">Todas</option>
              <option value="0">Sin agencia</option>
              {agencies.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div>
          <label className="label text-sm">Emisión desde</label>
          <input
            type="date"
            className="input input-bordered w-full"
            value={filters.issued_from}
            onChange={(e) => setFilters({ ...filters, issued_from: e.target.value })}
          />
        </div>
        <div>
          <label className="label text-sm">Emisión hasta</label>
          <input
            type="date"
            className="input input-bordered w-full"
            value={filters.issued_to}
            onChange={(e) => setFilters({ ...filters, issued_to: e.target.value })}
          />
        </div>
        <div className="flex items-end">
          <button type="submit" className="btn btn-primary w-full" disabled={isFetching}>
            Filtrar
          </button>
        </div>
      </form>

      <div className="mt-6 bg-base-100 shadow rounded-xl overflow-hidden">
        <div className="overflow-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr>
                <th>Voucher</th>
                <th>Pasajero</th>
                <th>Documento</th>
                <th>Plan</th>
                <th>Agencia</th>
                <th>Monto</th>
                <th>Moneda</th>
                <th>Emisión</th>
                <th>Salida</th>
                <th>Regreso</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: InsuranceTravelerReportRow) => (
                <tr key={row.id}>
                  <td className="font-mono text-xs">{row.voucher || "-"}</td>
                  <td>{`${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || "-"}</td>
                  <td>{row.document_number || "-"}</td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-medium">{row.plan_name || row.plan_label || "Plan"}</span>
                      {row.company_name && <span className="text-xs text-gray-500">{row.company_name}</span>}
                    </div>
                  </td>
                  <td>{row.agency_name || (row.agency_id ? `Agencia #${row.agency_id}` : "Sin agencia")}</td>
                  <td>{row.amount ?? row.value ?? "-"}</td>
                  <td>{row.currency || "USD"}</td>
                  <td>{row.purchase_created_at ? new Date(row.purchase_created_at).toLocaleDateString() : "-"}</td>
                  <td>{row.start_date ? new Date(row.start_date).toLocaleDateString() : "-"}</td>
                  <td>{row.end_date ? new Date(row.end_date).toLocaleDateString() : "-"}</td>
                  <td>
                    <span className={`badge ${row.canceled ? "badge-error" : "badge-success"}`}>
                      {row.canceled ? "Anulado" : "Vigente"}
                    </span>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={11} className="text-center py-6 text-sm text-gray-500">
                    Sin resultados para los filtros seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 flex items-center justify-between text-sm text-gray-600">
          <div>
            Página {pagination?.current_page ?? 1} de {pagination?.last_page ?? 1} · {pagination?.total ?? 0} registros
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-sm"
              disabled={(pagination?.current_page ?? 1) <= 1 || isFetching}
              onClick={() => handlePageChange((pagination?.current_page ?? 1) - 1)}
            >
              Anterior
            </button>
            <button
              className="btn btn-sm"
              disabled={(pagination?.current_page ?? 1) >= (pagination?.last_page ?? 1) || isFetching}
              onClick={() => handlePageChange((pagination?.current_page ?? 1) + 1)}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsuranceReportsPage;
