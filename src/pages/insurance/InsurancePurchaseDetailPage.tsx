import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { FaArrowLeft, FaEdit, FaSave, FaTimes } from "react-icons/fa";
import { insurancePurchaseService } from "../../services/insurancePurchaseService";
import type { InsuranceAgencyAgent } from "../../services/insurancePurchaseService";
import type { InsurancePurchaseDetail } from "../../types/insurancePurchaseDetail";
import type { TravelerDetail, TravelerPayload } from "../../types/insurancePurchaseTraveler";
import type { CheckoutPayload } from "../../types/insurancePurchase";
import type { PaymentDetail, PaymentPayload } from "../../types/insurancePurchasePayment";
import type { WompiMethod } from "../../types/payment";
import type { Agency } from "../../types/agency";
import { useAuthStore } from "../../stores/authStore";

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const parseDateInput = (value?: string | null) => {
  if (!value) return "";
  if (value.includes("T")) return value.split("T")[0] ?? "";
  return value;
};

const toISODateString = (value: string) => `${value}T00:00:00.000Z`;

const addUTCdays = (date: Date, days: number) => {
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  result.setUTCDate(result.getUTCDate() + days);
  return result;
};

const computeDurationDays = (start?: string | null, end?: string | null) => {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  const startUTC = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
  const endUTC = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
  if (endUTC < startUTC) return 0;
  return Math.round((endUTC - startUTC) / (1000 * 60 * 60 * 24));
};

const APPROVED_PAYMENT_STATUSES = new Set(["approved", "approved_partial", "completed", "successful", "paid", "confirmed"]);
const REJECTED_PAYMENT_STATUSES = new Set(["declined", "rejected", "error", "failed", "canceled", "cancelled"]);

const normalizePaymentText = (value?: string | null) => (value ?? "").toString().trim().toLowerCase();

const isApprovedPaymentStatus = (status?: string | null) => APPROVED_PAYMENT_STATUSES.has(normalizePaymentText(status));
const isRejectedPaymentStatus = (status?: string | null) => REJECTED_PAYMENT_STATUSES.has(normalizePaymentText(status));

const isAgencyCreditPayment = (payment?: PaymentDetail | null) => {
  if (!payment) return false;
  const platform = normalizePaymentText(payment.platform);
  const method = normalizePaymentText(payment.method);
  return platform === "agency" && (method === "credit" || method === "");
};

const getLatestPayment = (payments: PaymentDetail[]) => {
  if (!Array.isArray(payments) || payments.length === 0) return null;
  const getTime = (value?: string | null) => {
    if (!value) return 0;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  const score = (payment: PaymentDetail) =>
    Math.max(getTime(payment.paidAt), getTime(payment.updatedAt), getTime(payment.createdAt), Number(payment.id ?? 0));
  return [...payments].sort((a, b) => score(b) - score(a))[0] ?? null;
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

const formatPaymentMethodLabel = (payment?: PaymentDetail | null) => {
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

const pickFirstString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
};

const parseNumericValue = (value?: string | number | null) => {
  if (value == null) return null;
  const normalized = String(value).replace(/[,\s]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parsePositiveInt = (value?: string | number | null) => {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : null;
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

const formatAmountInCopWhenTrm = (
  amountRaw?: string | number | null,
  currencyRaw?: string | null,
  exchangeRateRaw?: string | number | null,
) => {
  const amount = parseNumericValue(amountRaw);
  if (amount == null) return amountRaw != null ? String(amountRaw) : "-";

  const currency = normalizeCurrencyCode(currencyRaw) ?? "USD";
  if (currency === "COP") {
    return formatMoney(amount, "COP");
  }
  if (currency !== "USD") {
    return formatMoney(amount, currency);
  }

  const usdAmountLabel = formatMoney(amount, "USD");
  const exchangeRate = parseNumericValue(exchangeRateRaw);
  if (exchangeRate && exchangeRate > 0) {
    const amountCop = amount * exchangeRate;
    return `${usdAmountLabel} / ${formatMoney(amountCop, "COP")}`;
  }

  return usdAmountLabel;
};

const formatSingleAmount = (amountRaw?: string | number | null, currencyRaw?: string | null) => {
  const amount = parseNumericValue(amountRaw);
  if (amount == null) return amountRaw != null ? String(amountRaw) : "-";
  const normalizedCurrency = normalizePaymentText(currencyRaw).toUpperCase();
  const currency = normalizedCurrency.length === 3 ? normalizedCurrency : "USD";
  return formatMoney(amount, currency);
};

const isCorresponsalPaymentMethod = (payment?: PaymentDetail | null) => {
  const method = normalizePaymentText(payment?.method);
  return method === "cash" || method === "bancolombia_collect";
};

const extractCorresponsalPaymentData = (payment?: PaymentDetail | null) => {
  if (!payment) return null;

  const meta = (payment.meta ?? {}) as Record<string, any>;
  const wompi = (meta.wompi ?? {}) as Record<string, any>;
  const extra = (wompi.payment_method?.extra ?? {}) as Record<string, unknown>;
  const raw = (meta.raw ?? {}) as Record<string, unknown>;
  const additional = (payment.additionalData ?? {}) as Record<string, unknown>;

  const paymentCode = pickFirstString(
    additional.payment_intention_identifier,
    extra.payment_intention_identifier,
    raw.payment_intention_identifier,
    payment.reference,
  );
  const agreementCode = pickFirstString(
    additional.business_agreement_code,
    extra.business_agreement_code,
    raw.business_agreement_code,
  );
  const reference = pickFirstString(payment.reference, payment.externalReference);
  const expirationDate = pickFirstString(payment.dueAt, extra.expiration_date, raw.expiration_date);

  if (!paymentCode && !agreementCode && !reference && !expirationDate) {
    return null;
  }

  return { paymentCode, agreementCode, reference, expirationDate };
};

const buildPaymentPayload = (detail: InsurancePurchaseDetail): PaymentPayload => {
  const primary = detail.payments[0];
  if (!primary || primary.platform === "agency") {
    return {
      platform: "agency",
      agencyCode: primary?.agencyCode ?? 1,
      priceOption: (primary?.priceOption ?? "public") as "public" | "net",
    };
  }

  const metaRaw = (primary.meta as any)?.raw;
  const wompiMethod = (primary.method as WompiMethod) || "CARD";
  const billingEmail = typeof metaRaw?.billingEmail === "string" ? metaRaw.billingEmail : primary.externalReference ?? undefined;
  const dataEntries: [string, string][] = [];
  if (metaRaw && typeof metaRaw === "object") {
    Object.entries(metaRaw).forEach(([key, value]) => {
      if (value != null) dataEntries.push([key, String(value)]);
    });
  }
  const data = Object.fromEntries(dataEntries);

  return {
    platform: "wompi",
    method: wompiMethod,
    billingEmail,
    data,
    priceOption: (primary.priceOption ?? "public") as "public" | "net",
  };
};

const travelerDetailToPayload = (traveler: TravelerDetail): TravelerPayload => ({
  id: traveler.id,
  index: traveler.index,
  firstName: traveler.firstName,
  lastName: traveler.lastName,
  documentType: traveler.documentType,
  documentNumber: traveler.documentNumber,
  birthDate: traveler.birthDate ?? "",
  age: traveler.age ?? undefined,
  phone: traveler.phone ?? undefined,
  email: traveler.email ?? undefined,
  address: traveler.address ?? undefined,
  city: traveler.city ?? undefined,
  country: traveler.country ?? undefined,
  voucher: traveler.voucher ?? undefined,
  canceled: traveler.canceled ? 1 : 0,
  canceledAt: traveler.canceledAt ?? undefined,
});

const detailToPayload = (detail: InsurancePurchaseDetail): CheckoutPayload => ({
  originName: detail.originName ?? undefined,
  originValue: detail.originValue ?? undefined,
  destinationName: detail.destinationName ?? undefined,
  destinationValue: detail.destinationValue ?? undefined,
  startDate: detail.startDate ?? undefined,
  endDate: detail.endDate ?? undefined,
  passengerCount: detail.passengerCount,
  emergencyContactName: detail.emergencyContactName ?? "",
  emergencyContactPhone: detail.emergencyContactPhone ?? "",
  planId: detail.planId,
  planName: detail.planName,
  planTypeId: detail.planTypeId,
  planTypeName: detail.planTypeName,
  travelers: detail.travelers.map(travelerDetailToPayload),
  payment: buildPaymentPayload(detail),
  agency: detail.agency ?? null,
  agentId: detail.agentId ?? null,
  page: detail.page ?? undefined,
});

const cloneDetail = (detail: InsurancePurchaseDetail): InsurancePurchaseDetail => ({
  ...detail,
  travelers: detail.travelers.map((traveler) => ({ ...traveler })),
  payments: detail.payments.map((payment) => ({ ...payment })),
});

type PurchaseEditableKey = "emergencyContactName" | "emergencyContactPhone";
type TravelerEditableKey =
  | "firstName"
  | "lastName"
  | "email"
  | "documentType"
  | "documentNumber"
  | "birthDate"
  | "phone"
  | "address"
  | "city"
  | "country"
  | "voucher";
type VoucherLanguage = "es" | "en";

const InsurancePurchaseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const canEditPurchase = useAuthStore((state) => state.hasPermission("insurance.update"));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<InsurancePurchaseDetail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<InsurancePurchaseDetail | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [tripDurationDays, setTripDurationDays] = useState(0);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [agencyAgents, setAgencyAgents] = useState<InsuranceAgencyAgent[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [loadingAgencyAgents, setLoadingAgencyAgents] = useState(false);
  const [voucherLanguage, setVoucherLanguage] = useState<VoucherLanguage>("es");

  const selectedAgencyId = useMemo(() => parsePositiveInt(formData?.agency), [formData?.agency]);
  const selectedAgentId = useMemo(() => parsePositiveInt(formData?.agentId), [formData?.agentId]);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    const fetchPurchase = async () => {
      try {
        window.dispatchEvent(new CustomEvent('loader:start'));
        setLoading(true);
        const data = await insurancePurchaseService.get(id);
        if (!controller.signal.aborted) {
          setPurchase(data);
          setFormData(cloneDetail(data));
          setTripDurationDays(computeDurationDays(data.startDate, data.endDate));
          setError(null);
        }
      } catch (err) {
        console.error(err);
        if (!controller.signal.aborted) setError("No se pudo cargar la compra.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
        window.dispatchEvent(new CustomEvent('loader:end'));
      }
    };
    fetchPurchase();
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!isEditing || agencies.length > 0) return;
    let cancelled = false;

    const fetchAgencies = async () => {
      try {
        setLoadingAgencies(true);
        const data = await insurancePurchaseService.listAgenciesForAssignment();
        if (!cancelled) {
          setAgencies(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setAgencies([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAgencies(false);
        }
      }
    };

    void fetchAgencies();
    return () => {
      cancelled = true;
    };
  }, [isEditing, agencies.length]);

  useEffect(() => {
    if (!isEditing || !selectedAgencyId) {
      setAgencyAgents([]);
      return;
    }

    let cancelled = false;
    const fetchAgencyAgents = async () => {
      try {
        setLoadingAgencyAgents(true);
        const data = await insurancePurchaseService.listAgencyAgents(selectedAgencyId);
        if (cancelled) return;
        const agents = Array.isArray(data) ? data : [];
        setAgencyAgents(agents);
        setFormData((prev) => {
          if (!prev) return prev;
          const currentAgentId = parsePositiveInt(prev.agentId);
          if (!currentAgentId) return prev;
          const exists = agents.some((agent) => agent.id === currentAgentId);
          if (exists) return prev;
          return { ...prev, agentId: null, agentName: null };
        });
      } catch (err) {
        console.error(err);
        if (!cancelled) {
          setAgencyAgents([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingAgencyAgents(false);
        }
      }
    };

    void fetchAgencyAgents();
    return () => {
      cancelled = true;
    };
  }, [isEditing, selectedAgencyId]);

  const travelers = useMemo(() => formData?.travelers ?? [], [formData]);
  const buildVoucherPath = useCallback((travelerIds: number[]) => {
    if (travelerIds.length === 0) return null;
    const params = new URLSearchParams({
      travelers: travelerIds.join(","),
      lang: voucherLanguage,
    });
    return `/insurance/vouchers/pdf?${params.toString()}`;
  }, [voucherLanguage]);
  const voucherAllPath = useMemo(() => {
    const ids = travelers
      .map((traveler) => traveler.id)
      .filter((value): value is number => typeof value === "number");
    return buildVoucherPath(ids);
  }, [travelers, buildVoucherPath]);

  const backPath = useMemo(() => {
    const state = location.state as { from?: unknown } | null;
    if (typeof state?.from === "string" && state.from.startsWith("/insurance/purchases")) {
      return state.from;
    }
    return "/insurance/purchases";
  }, [location.state]);

  const handleBack = () => {
    navigate(backPath);
  };

  const handleOpenVoucher = (path: string | null, enabled = true) => {
    if (!path || !enabled) return;
    window.open(path, "_blank", "noopener,noreferrer");
  };

  useEffect(() => {
    if (purchase) {
      setTripDurationDays(computeDurationDays(purchase.startDate, purchase.endDate));
    }
  }, [purchase?.startDate, purchase?.endDate]);

  const handleToggleEdit = () => {
    if (!purchase || !canEditPurchase) return;
    setUpdateSuccess(false);
    setError(null);
    setIsEditing((prev) => {
      if (!prev) {
        setFormData(cloneDetail(purchase));
        setFormErrors({});
      }
      return !prev;
    });
  };

  const handleInputChange = (key: PurchaseEditableKey, value: string) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [key]: value,
    });
  };

  const handleAgencyChange = (value: string) => {
    if (!formData) return;
    const nextAgency = value ? value : null;
    const nextAgencyName = value ? agencies.find((agency) => String(agency.id) === value)?.name ?? null : null;
    setFormData({
      ...formData,
      agency: nextAgency,
      agencyName: nextAgencyName,
      agentId: null,
      agentName: null,
    });
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.agentId;
      return next;
    });
  };

  const handleAgentChange = (value: string) => {
    if (!formData) return;
    const nextAgentId = value ? Number(value) : null;
    const nextAgentName = nextAgentId
      ? agencyAgents.find((agent) => agent.id === nextAgentId)?.name ?? null
      : null;
    setFormData({
      ...formData,
      agentId: nextAgentId,
      agentName: nextAgentName,
    });
    setFormErrors((prev) => {
      if (!prev.agentId) return prev;
      const next = { ...prev };
      delete next.agentId;
      return next;
    });
  };

  const handleTravelerChange = (index: number, key: TravelerEditableKey, value: string) => {
    if (!formData) return;
    const updated = formData.travelers.map((traveler, idx) =>
      idx === index ? ({ ...traveler, [key]: value } as TravelerDetail) : traveler
    ) as TravelerDetail[];
    setFormData({ ...formData, travelers: updated });
  };

  const handleToggleTravelerCanceled = (index: number) => {
  setFormData((prev) => {
    if (!prev) return prev;

    const travelers = prev.travelers.map((traveler, idx) => {
      if (idx !== index) return traveler;

      const canceled = !traveler.canceled; // toggle boolean
      return {
        ...traveler,
        canceled,
        canceledAt: canceled ? new Date().toISOString() : null,
      };
    });

    return { ...prev, travelers };
  });
};


  const handleStartDateChange = (value: string) => {
    if (!formData) return;
    const isoStart = value ? toISODateString(value) : null;
    let isoEnd = formData.endDate;
    if (isoStart) {
      const startDate = new Date(isoStart);
      if (!Number.isNaN(startDate.getTime())) {
        const endDate = addUTCdays(startDate, tripDurationDays);
        isoEnd = endDate.toISOString();
      }
    } else {
      isoEnd = null;
    }
    setFormData({ ...formData, startDate: isoStart, endDate: isoEnd });
    setFormErrors((prev) => {
      if (!prev.startDate) return prev;
      const next = { ...prev };
      delete next.startDate;
      return next;
    });
  };

  const validateForm = () => {
    if (!formData) return false;
    const errors: Record<string, string> = {};
    if (!formData.emergencyContactName || !formData.emergencyContactName.trim()) {
      errors.emergencyContactName = "Ingresa el nombre del contacto de emergencia.";
    }
    if (!formData.emergencyContactPhone || !formData.emergencyContactPhone.trim()) {
      errors.emergencyContactPhone = "Ingresa el teléfono del contacto de emergencia.";
    }
    if (!formData.startDate) {
      errors.startDate = "Selecciona la fecha de inicio.";
    }
    const selectedAgency = parsePositiveInt(formData.agency);
    const selectedAgent = parsePositiveInt(formData.agentId);
    if (selectedAgency && !selectedAgent) {
      errors.agentId = "Selecciona un agente de la agencia.";
    }
    formData.travelers.forEach((traveler, idx) => {
      if (!traveler.firstName || !traveler.firstName.trim()) {
        errors[`traveler-${idx}-firstName`] = "Ingresa los nombres.";
      }
      if (!traveler.lastName || !traveler.lastName.trim()) {
        errors[`traveler-${idx}-lastName`] = "Ingresa los apellidos.";
      }
      if (!traveler.documentNumber || !traveler.documentNumber.trim()) {
        errors[`traveler-${idx}-documentNumber`] = "Ingresa el número de documento.";
      }
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!formData || !id || !canEditPurchase) return;
    if (!validateForm()) return;
    try {
      window.dispatchEvent(new CustomEvent('loader:start'));
      setSaving(true);
      const payload = detailToPayload(formData);
      const updated = await insurancePurchaseService.update(id, payload);
      setPurchase(updated);
      setFormData(cloneDetail(updated));
      setTripDurationDays(computeDurationDays(updated.startDate, updated.endDate));
      setIsEditing(false);
      setError(null);
      setFormErrors({});
      setUpdateSuccess(true);
      } catch (err) {
        console.error(err);
      setError("No se pudo guardar la compra. Inténtalo nuevamente.");
      setUpdateSuccess(false);
    } finally {
      setSaving(false);
      window.dispatchEvent(new CustomEvent('loader:end'));
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <button className="btn btn-ghost mb-4" onClick={handleBack}>
          <FaArrowLeft className="mr-2" /> Volver
        </button>
        <div className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (error && !purchase) {
    return (
      <div className="max-w-5xl mx-auto p-6 space-y-4">
        <button className="btn btn-ghost" onClick={handleBack}>
          <FaArrowLeft className="mr-2" /> Volver
        </button>
        <div className="alert alert-error">
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!purchase || !formData) {
    return null;
  }

  const latestPayment = getLatestPayment(formData.payments);
  const paymentIsAgencyCredit = isAgencyCreditPayment(latestPayment);
  const paymentIsApproved = isApprovedPaymentStatus(latestPayment?.status);
  const paymentIsRejected = isRejectedPaymentStatus(latestPayment?.status);
  const canDownloadVoucher = paymentIsAgencyCredit || paymentIsApproved;
  const paymentStatusLabel = formatPaymentStatusLabel(latestPayment?.status);
  const paymentStatusBadgeClass = canDownloadVoucher ? "bg-emerald-600" : paymentIsRejected ? "bg-red-600" : "bg-amber-600";
  const paymentStatusSectionClass = canDownloadVoucher
    ? "bg-emerald-50 border-emerald-200"
    : paymentIsRejected
      ? "bg-red-50 border-red-200"
      : "bg-amber-50 border-amber-200";
  const paymentStatusNoticeClass = paymentIsRejected
    ? "text-sm text-red-800 bg-red-100 border border-red-200 rounded-2xl px-4 py-3"
    : "text-sm text-amber-800 bg-amber-100 border border-amber-200 rounded-2xl px-4 py-3";
  const paymentMethodLabel = formatPaymentMethodLabel(latestPayment);
  const isCorresponsalPayment = isCorresponsalPaymentMethod(latestPayment);
  const corresponsalPaymentData = isCorresponsalPayment ? extractCorresponsalPaymentData(latestPayment) : null;
  const showCorresponsalPendingData =
    isCorresponsalPayment && normalizePaymentText(latestPayment?.status) === "pending" && Boolean(corresponsalPaymentData);
  const transactionSaleAmount = parseNumericValue(formData.amount);
  const transactionSaleAmountLabel = formatAmountInCopWhenTrm(formData.amount, formData.currency, formData.exchangeRate);
  const commissionPercentValue = parseNumericValue(formData.commissionPercent) ?? 0;
  const explicitCommissionValue = parseNumericValue(formData.commissionValue);
  const commissionValue = explicitCommissionValue
    ?? (transactionSaleAmount != null && commissionPercentValue > 0
      ? (transactionSaleAmount * commissionPercentValue) / 100
      : 0);
  const isCommissionableSale = commissionValue > 0;
  const transactionNetAmount = transactionSaleAmount != null
    ? Math.max(transactionSaleAmount - commissionValue, 0)
    : null;
  const transactionNetAmountLabel = transactionNetAmount != null
    ? formatAmountInCopWhenTrm(transactionNetAmount, formData.currency, formData.exchangeRate)
    : transactionSaleAmountLabel;
  const paymentAmountLabel = paymentIsAgencyCredit
    ? (isCommissionableSale ? transactionNetAmountLabel : transactionSaleAmountLabel)
    : formatSingleAmount(
        latestPayment?.amount,
        latestPayment?.currency ?? formData.currency,
      );
  const agencyDisplayLabel = (() => {
    const name = typeof formData.agencyName === "string" ? formData.agencyName.trim() : "";
    if (name) return name;
    const agency = formData.agency;
    const numericAgency = parsePositiveInt(agency);
    if (numericAgency) return `Agencia #${numericAgency}`;
    if (agency == null) return "Sin agencia";
    const raw = String(agency).trim();
    return !raw || raw === "0" ? "Sin agencia" : raw;
  })();
  const agentDisplayLabel = (() => {
    const name = typeof formData.agentName === "string" ? formData.agentName.trim() : "";
    if (name) return name;
    if (selectedAgentId) return `Agente #${selectedAgentId}`;
    return "Sin agente";
  })();

  const renderField = (
    label: string,
    value: string | number | null | undefined,
    options?: {
      onChange?: (value: string) => void;
      type?: "text" | "date" | "tel" | "number" | "email";
      disabled?: boolean;
      errorKey?: string;
    }
  ) => {
    const { onChange, type = "text", disabled = false, errorKey } = options ?? {};
    const hasError = errorKey ? Boolean(formErrors[errorKey]) : false;
    const displayValue = value ?? "-";

    if (canEditPurchase && isEditing && onChange) {
      return (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[var(--color-secondary)] uppercase">{label}</span>
          <input
            className={`input input-bordered h-11 rounded-2xl bg-white ${hasError ? "input-error" : ""}`}
            type={type}
            value={type === "date" ? parseDateInput(typeof displayValue === "string" ? displayValue : String(displayValue)) : String(displayValue === "-" ? "" : displayValue)}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
          />
          {hasError && errorKey && <span className="text-error text-xs">{formErrors[errorKey]}</span>}
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-[var(--color-secondary)] uppercase">{label}</span>
        <span className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-700">
          {type === "date" ? formatDate(typeof displayValue === "string" ? displayValue : String(displayValue)) : displayValue}
        </span>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost" onClick={handleBack}>
            <FaArrowLeft className="mr-2" /> Volver
          </button>
          <h1 className="text-2xl font-semibold text-[var(--color-secondary)]">Detalle del Voucher #{purchase.id}</h1>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {voucherAllPath && (
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
          )}
          {voucherAllPath && (
            <button
              className="btn btn-outline btn-sm rounded-full px-5"
              disabled={!canDownloadVoucher}
              title={!canDownloadVoucher ? "El voucher se habilita cuando el pago esté aprobado." : "Abrir voucher"}
              onClick={() => handleOpenVoucher(voucherAllPath, canDownloadVoucher)}
            >
              Voucher general
            </button>
          )}
          {canEditPurchase && (
            isEditing ? (
              <>
                <button className="btn btn-outline btn-sm" onClick={handleToggleEdit} disabled={saving}>
                  <FaTimes className="mr-2" /> Cancelar
                </button>
                <button className={`btn btn-primary btn-sm rounded-full px-5 ${saving ? "loading" : ""}`} onClick={handleSave}>
                  {!saving && <FaSave className="mr-2" />} Guardar
                </button>
              </>
            ) : (
              <button className="btn btn-outline btn-sm rounded-full px-5" onClick={handleToggleEdit}>
                <FaEdit className="mr-2" /> Editar
              </button>
            )
          )}
        </div>
      </div>

      {updateSuccess && (
        <div className="alert alert-success rounded-2xl">
          <span>Compra actualizada correctamente.</span>
        </div>
      )}

      {error && purchase && (
        <div className="alert alert-error rounded-2xl">
          <span>{error}</span>
        </div>
      )}

      <section
        className={`rounded-3xl shadow-sm p-6 space-y-4 border ${paymentStatusSectionClass}`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-[var(--color-secondary)] font-semibold uppercase text-sm">Estado del pago</h2>
          <span className={`badge border-0 text-white ${paymentStatusBadgeClass}`}>
            {paymentStatusLabel}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
            <div className="text-xs font-semibold uppercase text-[var(--color-secondary)]">Método</div>
            <div className="text-sm text-gray-700 mt-1">{paymentMethodLabel}</div>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
            <div className="text-xs font-semibold uppercase text-[var(--color-secondary)]">Plataforma</div>
            <div className="text-sm text-gray-700 mt-1">{latestPayment?.platform || "Sin plataforma"}</div>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3">
            <div className="text-xs font-semibold uppercase text-[var(--color-secondary)]">Monto</div>
            <div className="text-sm text-gray-700 mt-1">{paymentAmountLabel}</div>
          </div>
        </div>
        {!canDownloadVoucher && (
          <div className={paymentStatusNoticeClass}>
            El voucher estará disponible cuando el pago quede aprobado.
          </div>
        )}
        {showCorresponsalPendingData && corresponsalPaymentData && (
          <div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase text-amber-900">Pago en corresponsal bancario</h3>
            <p className="text-sm text-amber-800">
              Presenta estos datos en el corresponsal para completar el pago.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {corresponsalPaymentData.paymentCode && (
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                  <div className="text-xs text-gray-600 uppercase">Código de pago</div>
                  <div className="font-mono text-sm font-semibold">{corresponsalPaymentData.paymentCode}</div>
                </div>
              )}
              {corresponsalPaymentData.agreementCode && (
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                  <div className="text-xs text-gray-600 uppercase">Código de convenio</div>
                  <div className="font-mono text-sm font-semibold">{corresponsalPaymentData.agreementCode}</div>
                </div>
              )}
              {corresponsalPaymentData.reference && (
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                  <div className="text-xs text-gray-600 uppercase">Referencia</div>
                  <div className="font-mono text-sm font-semibold">{corresponsalPaymentData.reference}</div>
                </div>
              )}
              {corresponsalPaymentData.expirationDate && (
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2">
                  <div className="text-xs text-gray-600 uppercase">Vence</div>
                  <div className="text-sm font-semibold">{formatDate(corresponsalPaymentData.expirationDate)}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 space-y-4">
        <h2 className="text-[var(--color-secondary)] font-semibold uppercase text-sm">Datos agencia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--color-secondary)] uppercase">Agencia</span>
            {isEditing ? (
              <select
                className="select select-bordered h-11 rounded-2xl bg-white"
                value={selectedAgencyId ? String(selectedAgencyId) : ""}
                onChange={(e) => handleAgencyChange(e.target.value)}
                disabled={saving || loadingAgencies}
              >
                <option value="">Sin agencia</option>
                {agencies.map((agency) => (
                  <option key={agency.id} value={agency.id}>
                    {agency.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-700">
                {agencyDisplayLabel}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--color-secondary)] uppercase">Agente</span>
            {isEditing ? (
              <>
                <select
                  className={`select select-bordered h-11 rounded-2xl bg-white ${formErrors.agentId ? "select-error" : ""}`}
                  value={selectedAgentId ? String(selectedAgentId) : ""}
                  onChange={(e) => handleAgentChange(e.target.value)}
                  disabled={saving || !selectedAgencyId || loadingAgencyAgents}
                >
                  <option value="">
                    {!selectedAgencyId
                      ? "Selecciona una agencia"
                      : loadingAgencyAgents
                        ? "Cargando agentes..."
                        : "Selecciona agente"}
                  </option>
                  {!loadingAgencyAgents && agencyAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
                {formErrors.agentId && <span className="text-error text-xs">{formErrors.agentId}</span>}
              </>
            ) : (
              <span className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-sm text-gray-700">
                {agentDisplayLabel}
              </span>
            )}
          </div>
          {renderField("Página", formData.pageName || formData.page)}
          {renderField("Valor venta", transactionSaleAmountLabel)}
          {renderField("Valor sin comisión", transactionNetAmountLabel)}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 space-y-4">
        <h2 className="text-[var(--color-secondary)] font-semibold uppercase text-sm">Datos del viaje</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderField("Origen", formData.originName)}
          {renderField("Destino", formData.destinationName)}
          {renderField("Salida", formData.startDate, { type: "date", onChange: handleStartDateChange, errorKey: "startDate" })}
          {renderField("Regreso", formData.endDate, { type: "date", disabled: true })}
          {renderField("Nombre del plan", formData.planName)}
          {renderField("Empresa", formData.planCompanyName)}
          {renderField("Días", `${tripDurationDays}`)}
          {renderField("Tipo de plan", formData.planTypeName)}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 space-y-5">
        <h2 className="text-[var(--color-secondary)] font-semibold uppercase text-sm">Datos del Pasajero</h2>
        <div className="space-y-6">
          {travelers.map((traveler, idx) => {
           const isCanceled = traveler.canceled ? traveler.canceled === (1 as any) || traveler.canceled === true : false;
           const travelerVoucherPath = traveler.id ? buildVoucherPath([traveler.id]) : null;

            return (
              <div
                key={traveler.id ?? idx}
                className={`space-y-4 ${isCanceled ? "bg-red-50" : "bg-gray-50"} border ${isCanceled ? "border-red-100" : "border-gray-200"} rounded-3xl p-5`}
              >
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-[var(--color-secondary)] text-sm uppercase">Pasajero #{traveler.index}</div>
                    {travelerVoucherPath && (
                      <button
                        type="button"
                        className="btn btn-outline btn-xs rounded-full"
                        disabled={!canDownloadVoucher}
                        title={!canDownloadVoucher ? "El voucher se habilita cuando el pago esté aprobado." : "Abrir voucher"}
                        onClick={() => handleOpenVoucher(travelerVoucherPath, canDownloadVoucher)}
                      >
                        Ver voucher
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={`btn btn-sm rounded-full ${isCanceled ? "btn-success" : "btn-error text-white"}`}
                      onClick={() => handleToggleTravelerCanceled(idx)}
                      disabled={!canEditPurchase || !isEditing}
                    >
                      {isCanceled ? "Reactivar" : "Anular"}
                    </button>
                  </div>
                </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {renderField("Nombres", traveler.firstName, { onChange: (value) => handleTravelerChange(idx, "firstName", value), errorKey: `traveler-${idx}-firstName` })}
                {renderField("Apellidos", traveler.lastName, { onChange: (value) => handleTravelerChange(idx, "lastName", value), errorKey: `traveler-${idx}-lastName` })}
                {renderField("Email", traveler.email, { onChange: (value) => handleTravelerChange(idx, "email", value) })}
                {renderField("Tipo documento", traveler.documentType, { onChange: (value) => handleTravelerChange(idx, "documentType", value) })}
                {renderField("No Documento", traveler.documentNumber, { onChange: (value) => handleTravelerChange(idx, "documentNumber", value), errorKey: `traveler-${idx}-documentNumber` })}
                {renderField("Fecha de nacimiento", traveler.birthDate, { type: "date", onChange: (value) => handleTravelerChange(idx, "birthDate", value) })}
                {renderField("Teléfono", traveler.phone, { onChange: (value) => handleTravelerChange(idx, "phone", value) })}
                {renderField("Dirección", traveler.address, { onChange: (value) => handleTravelerChange(idx, "address", value) })}
                {renderField("Ciudad", traveler.city, { onChange: (value) => handleTravelerChange(idx, "city", value) })}
                {renderField("País", traveler.country, { onChange: (value) => handleTravelerChange(idx, "country", value) })}
                <div className="col-span-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {renderField("Voucher", traveler.voucher, { onChange: (value) => handleTravelerChange(idx, "voucher", value) })}
                  {renderField("Anulado", isCanceled ? "Sí" : "No")}
                  {renderField("Fecha anulación", traveler.canceledAt, { type: "date" })}
                </div>
              </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-white border border-gray-200 rounded-3xl shadow-sm p-6 space-y-4">
        <h2 className="text-[var(--color-secondary)] font-semibold uppercase text-sm">Contacto de emergencia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {renderField("Nombre", formData.emergencyContactName, {
            onChange: (value) => handleInputChange("emergencyContactName", value),
            errorKey: "emergencyContactName",
          })}
          {renderField("Correo", travelers[0]?.email)}
          {renderField("Teléfono", formData.emergencyContactPhone, {
            onChange: (value) => handleInputChange("emergencyContactPhone", value),
            errorKey: "emergencyContactPhone",
          })}
        </div>
      </section>
    </div>
  );
};

export default InsurancePurchaseDetailPage;
