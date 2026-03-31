import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { DateRangePicker } from "react-date-range";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { FaWhatsapp } from "react-icons/fa";
import { FiEye, FiPrinter, FiUsers } from "react-icons/fi";
import { insurancePurchaseService } from "../../services/insurancePurchaseService";
import { agencyService } from "../../services/agencyService";
import { useAuthStore } from "../../stores/authStore";
import type {
  InsurancePurchaseListItem,
  InsurancePurchaseListPayment,
  InsurancePurchaseListTravelerSummary,
} from "../../types/insurancePurchaseList";
import type { PaginatedResponse } from "../../types/api";
import type { TravelerDetail } from "../../types/insurancePurchaseTraveler";
import type { Agency } from "../../types/agency";

const formatRangeLabel = (start?: Date | null, end?: Date | null) => {
  if (!start && !end) return "Seleccionar rango";
  if (start && end) return `${format(start, "dd/MM/yyyy")} - ${format(end, "dd/MM/yyyy")}`;
  if (start) return `${format(start, "dd/MM/yyyy")} - ...`;
  if (end) return `... - ${format(end, "dd/MM/yyyy")}`;
  return "Seleccionar rango";
};

const toParamDate = (date?: Date | null) => (date ? format(date, "yyyy-MM-dd") : undefined);
const DEFAULT_PAGE_SIZE = 20;
const NO_ASSIGNED_AGENCY_FILTER = "__no_assigned_agency__";

const rangeColor = "rgb(var(--p))";
const pickerHideStyles = `
.purchase-picker .rdrDefinedRangesWrapper {
  display: none !important;
}
`;

const APPROVED_PAYMENT_STATUSES = new Set(["approved", "approved_partial", "completed", "successful", "paid", "confirmed"]);
const REJECTED_PAYMENT_STATUSES = new Set(["declined", "rejected", "error", "failed", "canceled", "cancelled"]);

const normalizePaymentText = (value?: string | null) => (value ?? "").toString().trim().toLowerCase();

const isApprovedPaymentStatus = (status?: string | null) => APPROVED_PAYMENT_STATUSES.has(normalizePaymentText(status));
const isRejectedPaymentStatus = (status?: string | null) => REJECTED_PAYMENT_STATUSES.has(normalizePaymentText(status));

const isAgencyCreditPayment = (payment?: InsurancePurchaseListPayment | null) => {
  if (!payment) return false;
  const platform = normalizePaymentText(payment.platform);
  const method = normalizePaymentText(payment.method);
  return platform === "agency" && (method === "credit" || method === "");
};

const getLatestPayment = (item: InsurancePurchaseListItem) => {
  const payments = Array.isArray(item.payments) ? item.payments : [];
  if (payments.length === 0) return null;
  const getCreatedTime = (value?: string | null) => {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  return [...payments].sort((a, b) => {
    const createdDiff = getCreatedTime(b.created_at) - getCreatedTime(a.created_at);
    if (createdDiff !== 0) return createdDiff;
    return Number(b.id ?? 0) - Number(a.id ?? 0);
  })[0] ?? null;
};

const formatPaymentStatusLabel = (status?: string | null) => {
  const normalized = normalizePaymentText(status);
  const labels: Record<string, string> = {
    approved: "Aprobado",
    approved_partial: "Aprobado parcial",
    completed: "Completado",
    successful: "Exitoso",
    paid: "Pagado",
    confirmed: "Confirmado",
    pending: "Pendiente",
    declined: "Rechazado",
    error: "Error",
    canceled: "Anulado",
    cancelled: "Anulado",
  };
  return labels[normalized] ?? (status || "Sin estado");
};

const formatPaymentMethodLabel = (payment?: InsurancePurchaseListPayment | null) => {
  if (!payment) return "Sin método";
  if (isAgencyCreditPayment(payment)) return "Crédito agencia";
  const method = normalizePaymentText(payment.method).toUpperCase();
  const labels: Record<string, string> = {
    CARD: "Tarjeta",
    PSE: "PSE",
    NEQUI: "Nequi",
    CASH: "Corresponsal bancario",
    BANCOLOMBIA_TRANSFER: "Transferencia Bancolombia",
    BANCOLOMBIA_COLLECT: "Recaudo Bancolombia",
    CREDIT: "Crédito",
  };
  return labels[method] ?? (payment.method || "Sin método");
};

const formatDisplayDate = (value?: string | null) => {
  if (!value) return "-";
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return format(new Date(parsed), "dd/MM/yyyy");
};

const parseNumericValue = (value?: string | number | null) => {
  if (value == null) return null;
  const normalized = String(value).replace(/[,\s]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatMoney = (amount: number, currency: string) => {
  const safeCurrency = currency && currency.length === 3 ? currency.toUpperCase() : "COP";
  try {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: safeCurrency,
      maximumFractionDigits: safeCurrency === "COP" ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${safeCurrency}`;
  }
};

const normalizeCurrencyCode = (value?: string | null) => {
  const normalized = normalizePaymentText(value).toUpperCase();
  return normalized.length === 3 ? normalized : null;
};

const getExchangeRateForAmount = (item: InsurancePurchaseListItem, payment?: InsurancePurchaseListPayment | null) => {
  const source = item as InsurancePurchaseListItem & {
    exchangeRate?: string | number | null;
    trm?: string | number | null;
  };
  return source.exchange_rate ?? source.exchangeRate ?? source.trm ?? payment?.exchange_rate ?? null;
};

const formatSaleAmountInUsdAndCop = (item: InsurancePurchaseListItem, payment?: InsurancePurchaseListPayment | null) => {
  const amountRaw = item.amount ?? payment?.amount ?? null;
  const amount = parseNumericValue(amountRaw);
  if (amount == null) return amountRaw != null ? String(amountRaw) : "-";

  const currency = normalizeCurrencyCode(item.currency) ?? normalizeCurrencyCode(payment?.currency) ?? "USD";
  if (currency === "COP") {
    return formatMoney(amount, "COP");
  }
  if (currency !== "USD") {
    return formatMoney(amount, currency);
  }

  const usdAmountLabel = formatMoney(amount, "USD");
  const exchangeRate = parseNumericValue(getExchangeRateForAmount(item, payment));
  if (exchangeRate && exchangeRate > 0) {
    return `${usdAmountLabel} / ${formatMoney(amount * exchangeRate, "COP")}`;
  }
  return usdAmountLabel;
};

const resolveAgencyLabel = (item: InsurancePurchaseListItem) => {
  const agencyName = typeof item.agency_name === "string" ? item.agency_name.trim() : "";
  if (agencyName) return agencyName;

  const agencyRaw = item.agency;
  if (typeof agencyRaw === "number") {
    return agencyRaw > 0 ? `Agencia #${agencyRaw}` : "Sin agencia";
  }

  if (typeof agencyRaw === "string") {
    const trimmed = agencyRaw.trim();
    if (!trimmed || trimmed === "0") return "Sin agencia";
    if (/^\d+$/.test(trimmed)) {
      return Number(trimmed) > 0 ? `Agencia #${trimmed}` : "Sin agencia";
    }
    return trimmed;
  }

  return "Sin agencia";
};

const isTravelerCanceled = (traveler?: InsurancePurchaseListTravelerSummary | null) => {
  if (!traveler) return false;
  const raw = traveler.canceled;

  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw === 1;
  if (typeof raw === "string") {
    const normalized = raw.trim().toLowerCase();
    if (["1", "true", "si", "sí", "canceled", "cancelado", "anulado"].includes(normalized)) {
      return true;
    }
  }

  const statusLabel = (traveler.status_label ?? "").toString().trim().toLowerCase();
  const canceledLabel = (traveler.canceled_label ?? "").toString().trim().toLowerCase();
  return statusLabel.includes("cancel") || canceledLabel === "sí" || canceledLabel === "si";
};

type InsurancePurchaseListingMode = "approved" | "rejected";
type VoucherLanguage = "es" | "en";

interface InsurancePurchaseListPageProps {
  listingMode?: InsurancePurchaseListingMode;
}

const getPurchaseTravelerIds = (item: InsurancePurchaseListItem): number[] => {
  const travelers = Array.isArray(item.travelers) ? item.travelers : [];
  return travelers
    .map((traveler) => {
      const rawId = traveler.id;
      if (typeof rawId === "number" && Number.isFinite(rawId)) return rawId;
      const parsed = Number(rawId);
      return Number.isFinite(parsed) ? parsed : null;
    })
    .filter((id): id is number => typeof id === "number" && id > 0);
};

const getPurchaseEmissionDate = (item: InsurancePurchaseListItem): string | null => {
  if (typeof item.emission_date === "string" && item.emission_date.trim() !== "") {
    return item.emission_date;
  }

  const travelers = Array.isArray(item.travelers) ? item.travelers : [];
  const issuedAtValues = travelers
    .map((traveler) => (typeof traveler.issued_at === "string" ? traveler.issued_at : null))
    .filter((value): value is string => Boolean(value && value.trim() !== ""));

  if (issuedAtValues.length > 0) {
    return [...issuedAtValues].sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null;
  }

  const fallbackCreatedAt = (item as { created_at?: string | null }).created_at;
  return typeof fallbackCreatedAt === "string" && fallbackCreatedAt.trim() !== "" ? fallbackCreatedAt : null;
};

const InsurancePurchaseListPage: React.FC<InsurancePurchaseListPageProps> = ({ listingMode = "approved" }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const isAgencyUser = Boolean(
    user?.agency_id ||
    (Array.isArray(user?.role)
      ? user.role.some((role) => role?.type === 1)
      : (user as any)?.role?.type === 1)
  );
  const userAgencyId = user?.agency_id != null ? String(user.agency_id) : "";
  const [agencyFilter, setAgencyFilter] = useState(() => (isAgencyUser ? userAgencyId : ""));
  const [purchaseId, setPurchaseId] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [voucherNumber, setVoucherNumber] = useState("");
  const [departureRange, setDepartureRange] = useState<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });
  const [emissionRange, setEmissionRange] = useState<{ startDate: Date | null; endDate: Date | null }>({ startDate: null, endDate: null });
  const [showDeparturePicker, setShowDeparturePicker] = useState(false);
  const [showEmissionPicker, setShowEmissionPicker] = useState(false);
  const [data, setData] = useState<InsurancePurchaseListItem[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<InsurancePurchaseListItem>["meta"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [expandedPurchaseIds, setExpandedPurchaseIds] = useState<Record<number, boolean>>({});
  const [travelersByPurchase, setTravelersByPurchase] = useState<Record<number, TravelerDetail[]>>({});
  const [travelersLoadingByPurchase, setTravelersLoadingByPurchase] = useState<Record<number, boolean>>({});
  const [travelersErrorByPurchase, setTravelersErrorByPurchase] = useState<Record<number, string | null>>({});
  const [voucherLanguage, setVoucherLanguage] = useState<VoucherLanguage>("es");
  const loadRequestIdRef = useRef(0);

  const { data: agenciesResp = [] } = useQuery<Agency[]>({
    queryKey: ["agencies-all"],
    queryFn: () => agencyService.getAgencies(),
    enabled: !isAgencyUser,
  });
  const agencies = agenciesResp || [];

  useEffect(() => {
    if (!isAgencyUser) return;
    setAgencyFilter(userAgencyId);
  }, [isAgencyUser, userAgencyId]);

  const buildFilters = useCallback(
    (pageOverride?: number) => ({
      purchase_id: purchaseId.trim() || undefined,
      document_number: documentNumber.trim() || undefined,
      voucher: voucherNumber.trim() || undefined,
      agency: isAgencyUser ? (userAgencyId || NO_ASSIGNED_AGENCY_FILTER) : (agencyFilter || undefined),
      departure_from: toParamDate(departureRange.startDate),
      departure_to: toParamDate(departureRange.endDate),
      emission_from: toParamDate(emissionRange.startDate),
      emission_to: toParamDate(emissionRange.endDate),
      listing: listingMode,
      per_page: DEFAULT_PAGE_SIZE,
      page: pageOverride ?? page,
    }),
    [purchaseId, documentNumber, voucherNumber, isAgencyUser, userAgencyId, agencyFilter, departureRange, emissionRange, listingMode, page],
  );

  const loadData = useCallback(
    async (pageOverride?: number) => {
      const requestId = ++loadRequestIdRef.current;
      try {
        window.dispatchEvent(new CustomEvent('loader:start'));
        setLoading(true);
        setError(null);
        const response = await insurancePurchaseService.listPurchases(buildFilters(pageOverride));
        if (requestId !== loadRequestIdRef.current) return;
        setData(response.data);
        setMeta(response.meta);
        setExpandedPurchaseIds({});
        if (pageOverride) setPage(pageOverride);
      } catch (err) {
        console.error(err);
        if (requestId !== loadRequestIdRef.current) return;
        setError("No se pudieron cargar las compras.");
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setLoading(false);
        }
        window.dispatchEvent(new CustomEvent('loader:end'));
      }
    },
    [buildFilters],
  );

  useEffect(() => {
    loadData(1);
  }, [listingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    loadData(1);
  };

  const totalPages = useMemo(() => meta?.last_page ?? 1, [meta]);
  const currentPage = meta?.current_page ?? page;
  const pageTitle = listingMode === "rejected"
    ? "Listado de ventas seguros de viaje rechazadas"
    : "Listado de ventas seguros de viaje";
  const sectionTitle = listingMode === "rejected"
    ? "Ventas rechazadas o pendientes de aprobación"
    : "Ventas de seguros de viaje (Crédito agencia o pago aprobado)";
  const emptyMessage = listingMode === "rejected"
    ? "No hay ventas rechazadas para esta búsqueda."
    : "No hay ventas de seguros para esta búsqueda.";

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) return;
    loadData(nextPage);
  };

  const loadPurchaseTravelers = useCallback(async (purchaseIdValue: number) => {
    try {
      setTravelersLoadingByPurchase((prev) => ({ ...prev, [purchaseIdValue]: true }));
      setTravelersErrorByPurchase((prev) => ({ ...prev, [purchaseIdValue]: null }));
      const detail = await insurancePurchaseService.get(purchaseIdValue);
      setTravelersByPurchase((prev) => ({
        ...prev,
        [purchaseIdValue]: Array.isArray(detail.travelers) ? detail.travelers : [],
      }));
    } catch (err) {
      console.error(err);
      setTravelersErrorByPurchase((prev) => ({
        ...prev,
        [purchaseIdValue]: "No se pudo cargar la información de pasajeros.",
      }));
    } finally {
      setTravelersLoadingByPurchase((prev) => ({ ...prev, [purchaseIdValue]: false }));
    }
  }, []);

  const handleTogglePassengersAccordion = useCallback((purchaseIdValue: number) => {
    const willOpen = !expandedPurchaseIds[purchaseIdValue];
    setExpandedPurchaseIds((prev) => ({ ...prev, [purchaseIdValue]: willOpen }));

    if (willOpen && travelersByPurchase[purchaseIdValue] === undefined && !travelersLoadingByPurchase[purchaseIdValue]) {
      void loadPurchaseTravelers(purchaseIdValue);
    }
  }, [expandedPurchaseIds, travelersByPurchase, travelersLoadingByPurchase, loadPurchaseTravelers]);

  const buildVoucherPath = useCallback((travelerIds: number[], lang: VoucherLanguage) => {
    const params = new URLSearchParams({
      travelers: travelerIds.join(","),
      lang,
    });
    return `/insurance/vouchers/pdf?${params.toString()}`;
  }, []);

  const handlePrintVoucher = useCallback((item: InsurancePurchaseListItem) => {
    const travelerIds = getPurchaseTravelerIds(item);
    if (travelerIds.length === 0) return;
    const voucherPath = buildVoucherPath(travelerIds, voucherLanguage);
    window.open(voucherPath, "_blank", "noopener,noreferrer");
  }, [buildVoucherPath, voucherLanguage]);

  const handleSendVoucherWhatsapp = useCallback((item: InsurancePurchaseListItem) => {
    const travelerIds = getPurchaseTravelerIds(item);
    if (travelerIds.length === 0) return;

    const apiBase = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "");
    const voucherQuery = new URLSearchParams({
      travelers: travelerIds.join(","),
      lang: voucherLanguage,
    });
    const voucherUrl = apiBase
      ? `${apiBase}/insurance/vouchers/pdf?${voucherQuery.toString()}`
      : `${window.location.origin}/insurance/vouchers/pdf?${voucherQuery.toString()}`;

    const message = voucherLanguage === "en"
      ? `Hello, here is your travel assistance voucher: ${voucherUrl}`
      : `Hola, te comparto tu voucher de asistencia: ${voucherUrl}`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }, [voucherLanguage]);

  const renderRows = () => {
    if (loading) {
      return (
        <tr>
          <td colSpan={9} className="text-center py-10">
            <span className="loading loading-spinner loading-lg text-primary" />
          </td>
        </tr>
      );
    }

    if (data.length === 0) {
      return (
        <tr>
          <td colSpan={9} className="text-center py-6 text-sm text-gray-500">
            {emptyMessage}
          </td>
        </tr>
      );
    }

    return data.map((item) => {
      const payment = getLatestPayment(item);
      const methodLabel = formatPaymentMethodLabel(payment);
      const statusLabel = formatPaymentStatusLabel(payment?.status);
      const approved = payment ? isAgencyCreditPayment(payment) || isApprovedPaymentStatus(payment.status) : false;
      const rejected = isRejectedPaymentStatus(payment?.status);
      const showStatusBadge = listingMode === "rejected";
      const statusBadgeClass = approved ? "badge-success" : rejected ? "badge-error" : "badge-warning";
      const isAccordionOpen = Boolean(expandedPurchaseIds[item.id]);
      const travelers = travelersByPurchase[item.id] ?? [];
      const travelersLoading = Boolean(travelersLoadingByPurchase[item.id]);
      const travelersError = travelersErrorByPurchase[item.id];
      const amountLabel = formatSaleAmountInUsdAndCop(item, payment);
      const purchaseTravelers = Array.isArray(item.travelers) ? item.travelers : [];
      const travelerIds = getPurchaseTravelerIds(item);
      const canUseVoucherActions = approved && travelerIds.length > 0;
      const emissionDateValue = getPurchaseEmissionDate(item);
      const canceledTravelersCount = purchaseTravelers.filter((traveler) => isTravelerCanceled(traveler)).length;
      const totalTravelers = purchaseTravelers.length > 0
        ? purchaseTravelers.length
        : Number(item.travelers_count ?? 0);

      return (
        <React.Fragment key={item.id}>
          <tr>
            <td>{item.id}</td>
            <td>{item.plan_name ?? "-"}</td>
            <td>{item.start_date ? format(new Date(item.start_date), "dd/MM/yyyy") : "-"}</td>
            <td>{item.end_date ? format(new Date(item.end_date), "dd/MM/yyyy") : "-"}</td>
            <td>{formatDisplayDate(emissionDateValue)}</td>
            <td>{amountLabel}</td>
            <td>{resolveAgencyLabel(item)}</td>
            <td>
              <div className="flex flex-col gap-1">
                <span className="badge badge-sm badge-ghost">{methodLabel}</span>
                {showStatusBadge && (
                  <span className={`badge badge-sm ${statusBadgeClass}`}>{statusLabel}</span>
                )}
                {canceledTravelersCount > 0 && (
                  <span className="badge badge-sm badge-error">
                    {`Anulados ${canceledTravelersCount}${totalTravelers > 0 ? `/${totalTravelers}` : ""}`}
                  </span>
                )}
              </div>
            </td>
            <td>
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  className={`btn btn-xs btn-circle border-0 text-white ${canUseVoucherActions ? "bg-blue-500 hover:bg-blue-600" : "bg-blue-300"}`}
                  disabled={!canUseVoucherActions}
                  title={canUseVoucherActions ? "Abrir voucher general para imprimir" : "El voucher se habilita en ventas aprobadas con viajeros"}
                  aria-label="Imprimir voucher"
                  onClick={() => handlePrintVoucher(item)}
                >
                  <FiPrinter className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={`btn btn-xs btn-circle border-0 text-white ${canUseVoucherActions ? "bg-green-500 hover:bg-green-600" : "bg-green-300"}`}
                  disabled={!canUseVoucherActions}
                  title={canUseVoucherActions ? "Enviar voucher general por WhatsApp" : "El voucher se habilita en ventas aprobadas con viajeros"}
                  aria-label="Enviar voucher por WhatsApp"
                  onClick={() => handleSendVoucherWhatsapp(item)}
                >
                  <FaWhatsapp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className={`btn btn-xs btn-circle border-0 text-white ${isAccordionOpen ? "bg-amber-600 hover:bg-amber-700" : "bg-amber-500 hover:bg-amber-600"}`}
                  title={isAccordionOpen ? "Ocultar pasajeros" : "Ver pasajeros"}
                  aria-label="Pasajeros"
                  onClick={() => handleTogglePassengersAccordion(item.id)}
                >
                  <FiUsers className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  className="btn btn-xs btn-circle border-0 bg-indigo-500 text-white hover:bg-indigo-600"
                  title="Ver detalle de la venta"
                  aria-label="Ver detalle"
                  onClick={() =>
                    navigate(`/insurance/purchases/${item.id}`, {
                      state: { from: `${location.pathname}${location.search}` },
                    })
                  }
                >
                  <FiEye className="h-3.5 w-3.5" />
                </button>
              </div>
            </td>
          </tr>
          {isAccordionOpen && (
            <tr>
              <td colSpan={9} className="bg-base-100 px-4 py-3">
                <div className="collapse collapse-arrow border border-gray-200 bg-gray-50 rounded-2xl">
                  <input type="checkbox" className="min-h-0" checked readOnly />
                  <div className="collapse-title py-3 text-sm font-semibold text-[var(--color-secondary)]">
                    Pasajeros de la venta #{item.id}
                  </div>
                  <div className="collapse-content pt-1 pb-4">
                    {travelersLoading && (
                      <div className="flex justify-center py-4">
                        <span className="loading loading-spinner text-primary" />
                      </div>
                    )}

                    {!travelersLoading && travelersError && (
                      <div className="alert alert-error rounded-2xl">
                        <span>{travelersError}</span>
                      </div>
                    )}

                    {!travelersLoading && !travelersError && travelers.length === 0 && (
                      <p className="text-sm text-gray-500">Esta venta no tiene pasajeros registrados.</p>
                    )}

                    {!travelersLoading && !travelersError && travelers.length > 0 && (
                      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
                        <table className="table table-sm w-full min-w-[560px]">
                          <thead>
                            <tr className="text-xs uppercase text-gray-500">
                              <th>Nombre</th>
                              <th>Documento</th>
                              <th>Fecha nacimiento</th>
                              <th>Voucher</th>
                              <th>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {travelers.map((traveler) => {
                              const travelerName = `${traveler.firstName ?? ""} ${traveler.lastName ?? ""}`.trim() || "-";
                              const document = `${traveler.documentType ?? ""} ${traveler.documentNumber ?? ""}`.trim() || "-";
                              const isCanceledTraveler = Boolean(traveler.canceled);
                              return (
                                <tr key={traveler.id} className={isCanceledTraveler ? "bg-red-50/60" : undefined}>
                                  <td className="font-medium">{travelerName}</td>
                                  <td>{document}</td>
                                  <td>{formatDisplayDate(traveler.birthDate)}</td>
                                  <td>{traveler.voucher || "-"}</td>
                                  <td>
                                    <span className={`badge badge-sm ${isCanceledTraveler ? "badge-error" : "badge-success"}`}>
                                      {isCanceledTraveler ? "Anulado" : "Activo"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </td>
            </tr>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <style>{pickerHideStyles}</style>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-[var(--color-secondary)]">{pageTitle}</h1>
        </div>
        <div className="text-sm text-gray-500">Total registros: {meta?.total ?? 0}</div>
      </div>

      <form className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 space-y-4" onSubmit={handleSearch}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-[var(--color-secondary)]">ID Compra</span>
            <input className="input input-bordered h-11 rounded-2xl" value={purchaseId} onChange={(e) => setPurchaseId(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-[var(--color-secondary)]">Documento pasajero</span>
            <input className="input input-bordered h-11 rounded-2xl" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-[var(--color-secondary)]">Voucher</span>
            <input className="input input-bordered h-11 rounded-2xl" value={voucherNumber} onChange={(e) => setVoucherNumber(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-[var(--color-secondary)]">Fechas de viaje</span>
            <button type="button" className="btn btn-outline h-11 rounded-2xl justify-between" onClick={() => setShowDeparturePicker(true)}>
              {formatRangeLabel(departureRange.startDate, departureRange.endDate)}
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-[var(--color-secondary)]">Fechas de emisión</span>
            <button type="button" className="btn btn-outline h-11 rounded-2xl justify-between" onClick={() => setShowEmissionPicker(true)}>
              {formatRangeLabel(emissionRange.startDate, emissionRange.endDate)}
            </button>
          </div>
          {!isAgencyUser && (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-[var(--color-secondary)]">Agencia</span>
              <select
                className="select select-bordered h-11 rounded-2xl"
                value={agencyFilter}
                onChange={(e) => setAgencyFilter(e.target.value)}
              >
                <option value="">Todas</option>
                <option value="0">Sin agencia</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 justify-end">
          <button type="button" className="btn btn-ghost" onClick={() => {
            setPurchaseId("");
            setDocumentNumber("");
            setVoucherNumber("");
            setAgencyFilter(isAgencyUser ? userAgencyId : "");
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

      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase text-[var(--color-secondary)]">{sectionTitle}</h2>
          <div className="flex items-center gap-2 rounded-full border border-base-300 bg-base-100 px-2 py-1">
            <span className="text-[11px] font-semibold uppercase text-[var(--color-secondary)]">Idioma</span>
            <div className="join">
              {(["es", "en"] as VoucherLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  className={`btn btn-xs join-item ${voucherLanguage === lang ? "btn-primary text-white" : "btn-outline"}`}
                  onClick={() => setVoucherLanguage(lang)}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="table table-zebra w-full">
            <thead>
              <tr className="text-xs text-gray-500 uppercase">
                <th>ID</th>
                <th>Plan</th>
                <th>Salida</th>
                <th>Regreso</th>
                <th>Emisión</th>
                <th>Monto</th>
                <th>Agencia</th>
                <th>Pago</th>
                <th></th>
              </tr>
            </thead>
            <tbody>{renderRows()}</tbody>
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
          <div className="bg-white rounded-3xl p-4 purchase-picker" onClick={(e) => e.stopPropagation()}>
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
          <div className="bg-white rounded-3xl p-4 purchase-picker" onClick={(e) => e.stopPropagation()}>
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

export default InsurancePurchaseListPage;
