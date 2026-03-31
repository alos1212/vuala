import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaDownload, FaTimes, FaUpload, FaUser } from "react-icons/fa";
import * as XLSX from "xlsx";
import { parse, isValid as isValidDate, format as formatDateFns } from "date-fns";
import { es as esLocale } from "date-fns/locale";
import PaymentMethodSelector from "../../components/payments/PaymentMethodSelector";
import type { PaymentSelection } from "../../types/payment";
import { usePageStore } from "../../stores/usePageStore";
import { useAuthStore } from "../../stores/authStore";
import { insurancePurchaseService } from "../../services/insurancePurchaseService";
import type { CheckoutPayload } from "../../types/insurancePurchase";
import type { TravelerPayload } from "../../types/insurancePurchaseTraveler";
import type { PaymentPayload, PaymentPayloadBase } from "../../types/insurancePurchasePayment";

type TravelerForm = {
  id?: number;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  birthDate: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  country: string;
};

type EmergencyContactForm = {
  name: string;
  phone: string;
};

type FieldErrors = Record<string, string>;
type PaymentFieldErrors = Record<string, string>;

/*type AgencyPaymentPayload = Extract<PaymentPayloadBase, { platform: "agency" }>;
type WompiPaymentPayload = Extract<PaymentPayloadBase, { platform: "wompi" }>;*/

type TripMode = "travelers" | "groups";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\d{7,20}$/;
const FORCE_AGENCY_CREDIT_PERMISSION = "insurance.agency-credit.force";

const isValidEmail = (email: string) => emailPattern.test(email.trim());
const isValidPhone = (phone: string) => phonePattern.test(phone.trim());

const PASSENGER_TEMPLATE_COLUMNS = [
  { key: "firstName", title: "Nombres", description: "Nombres del pasajero en mayúsculas." },
  { key: "lastName", title: "Apellidos", description: "Apellidos del pasajero en mayúsculas." },
  { key: "documentNumber", title: "NumeroDocumento", description: "Número de documento sin caracteres especiales." },
  { key: "birthDate", title: "FechaNacimiento (YYYY-MM-DD)", description: "Fecha con formato AAAA-MM-DD." },
] as const;

type PassengerTemplateKey = typeof PASSENGER_TEMPLATE_COLUMNS[number]["key"];

const passengerColumnTitle: Record<PassengerTemplateKey, string> = PASSENGER_TEMPLATE_COLUMNS.reduce(
  (acc, column) => {
    acc[column.key] = column.title;
    return acc;
  },
  {} as Record<PassengerTemplateKey, string>,
);

const toISODateString = (date: Date) => date.toISOString().slice(0, 10);

const KNOWN_DATE_PATTERNS = [
  "yyyy-MM-dd",
  "yyyy/MM/dd",
  "dd-MM-yyyy",
  "dd/MM/yyyy",
  "d-M-yyyy",
  "d/M/yyyy",
  "MM-dd-yyyy",
  "MM/dd/yyyy",
  "M-d-yyyy",
  "M/d/yyyy",
  "dd.MM.yyyy",
  "d.M.yyyy",
  "dd-MM-yy",
  "dd/MM/yy",
  "MM-dd-yy",
  "MM/dd/yy",
  "d-M-yy",
  "d/M/yy",
  "dd MMM yyyy",
  "d MMM yyyy",
] as const;

const normalizeBirthDateFromExcel = (value: unknown): string => {
  if (!value) return "";
  if (value instanceof Date) {
    return toISODateString(value);
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF?.parse_date_code?.(value);
    if (parsed) {
      const { y, m, d } = parsed;
      const padded = (n: number) => String(n).padStart(2, "0");
      return `${y}-${padded(m)}-${padded(d)}`;
    }
  }
  const str = String(value).trim();
  if (!str) return "";
  const sanitized = str
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[.\s]+/g, (match) => (match.includes(".") ? "/" : match.includes(" ") ? " " : match))
    .replace(/\s+/g, " ")
    .trim();
  for (const pattern of KNOWN_DATE_PATTERNS) {
    let parsed = parse(sanitized, pattern, new Date(), { locale: esLocale });
    if (!isValidDate(parsed)) {
      parsed = parse(sanitized, pattern, new Date());
    }
    if (isValidDate(parsed)) {
      const normalized = formatDateFns(parsed, "yyyy-MM-dd");
      return normalized;
    }
  }
  const dateWithoutTime = sanitized.replace(/[T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?$/, "");
  if (dateWithoutTime !== sanitized) {
    let parsed = parse(dateWithoutTime, "yyyy-MM-dd", new Date(), { locale: esLocale });
    if (!isValidDate(parsed)) {
      parsed = parse(dateWithoutTime, "yyyy-MM-dd", new Date());
    }
    if (isValidDate(parsed)) {
      return formatDateFns(parsed, "yyyy-MM-dd");
    }
  }
  return str;
};

const normalizeBirthDateFromApi = (value?: string | null): string => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})[T\s]/);
  if (isoMatch) return isoMatch[1];
  for (const pattern of KNOWN_DATE_PATTERNS) {
    let parsed = parse(trimmed, pattern, new Date(), { locale: esLocale });
    if (!isValidDate(parsed)) {
      parsed = parse(trimmed, pattern, new Date());
    }
    if (isValidDate(parsed)) {
      return formatDateFns(parsed, "yyyy-MM-dd");
    }
  }
  return trimmed;
};

const normalizeAgencyCode = (value: number | string | null | undefined): number | null => {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizePaymentPayload = (selection: PaymentSelection): PaymentPayloadBase => {
  if (selection.platform === "agency") {
    return { platform: "agency", agencyCode: normalizeAgencyCode(selection.agencyCode) };
  }
  const trimmedData: Record<string, string> = {};
  Object.entries(selection.data || {}).forEach(([key, value]) => {
    if (typeof value === "string") trimmedData[key] = value.trim();
  });
  return {
    platform: "wompi",
    method: selection.method,
    billingEmail: selection.billingEmail?.trim(),
    data: trimmedData,
  };
};

const validatePaymentSelection = (
  selection: PaymentSelection,
  options?: { allowAgencyCredit?: boolean },
): { issues: string[]; fieldErrors: PaymentFieldErrors } => {
  if (selection.platform === "agency") {
    if (options?.allowAgencyCredit === false) {
      return {
        issues: ["La agencia seleccionada no tiene cupo de crédito disponible."],
        fieldErrors: { platform: "La agencia seleccionada no tiene cupo de crédito disponible." },
      };
    }
    return { issues: [], fieldErrors: {} };
  }

  const issues: string[] = [];
  const fieldErrors: PaymentFieldErrors = {};
  const billingEmail = selection.billingEmail?.trim() ?? "";
  if (!billingEmail) {
    fieldErrors.billingEmail = "Ingresa el email de facturación.";
  } else if (!isValidEmail(billingEmail)) {
    fieldErrors.billingEmail = "Ingresa un email válido.";
  }

  const data = selection.data || {};
  const read = (key: string) => (data[key] ?? "").toString().trim();
  const termsAccepted = read("termsAccepted") === "1";

  switch (selection.method) {
    case "CARD": {
      if (!read("cardNumber")) fieldErrors.cardNumber = "Ingresa el número de la tarjeta.";
      if (!read("cardBrand") || read("cardBrand") === "unknown") fieldErrors.cardBrand = "La tarjeta debe ser Visa, Mastercard o Amex.";
      if (!read("expirationMonth")) fieldErrors.expirationMonth = "Selecciona el mes de expiración.";
      if (!read("expirationYear")) fieldErrors.expirationYear = "Selecciona el año de expiración.";
      if (!read("cvc")) fieldErrors.cvc = "Ingresa el código CVC.";
      if (!read("cardName")) fieldErrors.cardName = "Ingresa el nombre del titular.";
      if (!read("cardholderDocumentType")) fieldErrors.cardholderDocumentType = "Selecciona el tipo de documento.";
      if (!read("cardholderDocumentNumber")) fieldErrors.cardholderDocumentNumber = "Ingresa el número de documento.";
      if (!read("installments")) fieldErrors.installments = "Selecciona el número de cuotas.";
      if (!termsAccepted) fieldErrors.termsAccepted = "Debes aceptar los términos y condiciones.";
      break;
    }
    case "BANCOLOMBIA_TRANSFER": {
      if (!read("userType")) fieldErrors.userType = "Selecciona el tipo de persona.";
      if (!termsAccepted) fieldErrors.termsAccepted = "Debes aceptar los términos y condiciones.";
      break;
    }
    case "CASH": {
      if (!termsAccepted) fieldErrors.termsAccepted = "Debes aceptar los términos y condiciones.";
      break;
    }
    case "NEQUI": {
      const nequiPhone = read("nequiPhone");
      if (!nequiPhone) {
        fieldErrors.nequiPhone = "Ingresa el número asociado a la cuenta Nequi.";
      } else if (!isValidPhone(nequiPhone)) {
        fieldErrors.nequiPhone = "Ingresa un número válido.";
      }
      if (!termsAccepted) fieldErrors.termsAccepted = "Debes aceptar los términos y condiciones.";
      break;
    }
    case "PSE": {
      if (!read("pseCustomerType")) fieldErrors.pseCustomerType = "Selecciona el tipo de persona.";
      if (!read("pseBankCode") || read("pseBankCode") === "0") fieldErrors.pseBankCode = "Selecciona un banco.";
      if (!read("pseDocumentType")) fieldErrors.pseDocumentType = "Selecciona un tipo de documento.";
      if (!read("pseDocumentNumber")) fieldErrors.pseDocumentNumber = "Ingresa el número de documento.";
      if (!termsAccepted) fieldErrors.termsAccepted = "Debes aceptar los términos y condiciones.";
      break;
    }
    default:
      break;
  }

  issues.push(...Object.values(fieldErrors));
  return { issues, fieldErrors };
};

const cleanString = (value: string) => value.trim();

const parseAmount = (value: unknown): number | null => {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const normalized = String(value).replace(/[^\d.-]/g, "").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

type CheckoutState = {
    summary?: {
    originLabel?: string;
    destinationLabel?: string;
    startDate?: string;
    endDate?: string;
    passengers?: number;
    ages?: number[];
    tripMode?: TripMode;
    planName?: string;
    page?: string;
    agency?: string | null;
    agencyName?: string | null;
    product?: string;
      plan?: string;
      currency?: "COP" | "USD" | null;
      totalUSD?: number;
      exchangeRate?: number | null;
      totalCOP?: number | null;
    commissionValue?: number | null;
    commissionCOP?: number | null;
    commissionPercent?: number | null;
    commissionType?: string | null;
    agencyCreditLimit?: number | null;
    agencyCreditAvailable?: number | null;
    planId?: number | null;
    planTypeId?: string | number | null;
    planTypeName?: string | null;
  };
  restore?: {
    form: {
      origin: { value: string | number; label: string } | null;
      destination: { value: string | number; label: string } | null;
      start_date: string;
      end_date: string;
      passengers: number;
      ages: number[];
      trip_mode?: TripMode;
      agency?: string | null;
      page?: string;
    };
    results: any[] | null;
  };
};

const currencyCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n || 0);

const currencyUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n || 0
  );

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { state } = useLocation() as { state: CheckoutState };
  const currentPage = usePageStore((store) => store.page);
  const canForceAgencyCredit = useAuthStore((store) =>
    store.hasPermission(FORCE_AGENCY_CREDIT_PERMISSION)
  );
  const s = state?.summary;
  const restoreForm = state?.restore?.form;
  const tripMode: TripMode =
    (restoreForm?.trip_mode as TripMode | undefined)
    ?? (s?.tripMode as TripMode | undefined)
    ?? "travelers";
  const selectedAgencyId = s?.agency ?? restoreForm?.agency ?? null;
  const pageValue = s?.page ?? restoreForm?.page ?? currentPage;
  const planTypeIdValue = s?.planTypeId ?? null;
  const planTypeTitle = s?.planTypeName ?? "Internacional";
  const selectedAgencyName =
    s?.agencyName
    ?? (selectedAgencyId === "0"
      ? "Sin agencia"
      : selectedAgencyId != null
        ? String(selectedAgencyId)
        : null);
  const selectedAgencyCode = normalizeAgencyCode(selectedAgencyId);
  const hasAssignedAgency =
    selectedAgencyId != null
    && String(selectedAgencyId).trim() !== ""
    && String(selectedAgencyId).trim() !== "0";
  const agencyCreditAvailable = parseAmount(s?.agencyCreditAvailable);
  const agencyCreditLimit = parseAmount(s?.agencyCreditLimit);
  const resolvedAgencyCredit = agencyCreditAvailable ?? agencyCreditLimit;
  const hasAgencyCreditByBalance = resolvedAgencyCredit == null ? true : resolvedAgencyCredit > 0;
  const canUseAgencyCredit = hasAssignedAgency && (hasAgencyCreditByBalance || canForceAgencyCredit);

  const summaryCurrency = String(s?.currency ?? "").trim().toUpperCase() === "COP" ? "COP" : "USD";
  const isCopSale = summaryCurrency === "COP";
  const priceCOP = s?.totalCOP ?? (isCopSale && s?.totalUSD != null ? Math.round(s.totalUSD) : null);
  const priceUSD = isCopSale ? null : (s?.totalUSD ?? null);
  const exchangeRate = isCopSale ? 1 : (s?.exchangeRate ?? null);
  const commissionValue = Number(s?.commissionValue ?? 0) || 0;
  const commissionPercent = Number(s?.commissionPercent ?? 0) || 0;
  const commissionType = String(s?.commissionType ?? "not_included").toLowerCase();
  const commissionCOP = s?.commissionCOP
    ?? (isCopSale
      ? (commissionValue > 0
        ? Math.round(commissionValue)
        : (priceCOP != null && commissionPercent > 0
          ? Math.round(priceCOP * (commissionPercent / 100))
          : null))
      : (priceCOP != null && commissionPercent > 0
        ? Math.round(priceCOP * (commissionPercent / 100))
        : (exchangeRate && commissionValue > 0 ? Math.round(commissionValue * exchangeRate) : null)));
  const commissionUSD = isCopSale
    ? 0
    : (commissionValue > 0
    ? commissionValue
    : (commissionPercent > 0 && priceUSD != null ? (priceUSD * (commissionPercent / 100)) : 0));
  const netCOP = priceCOP != null ? Math.max(priceCOP - (commissionCOP ?? 0), 0) : null;
  const netUSD = !isCopSale && priceUSD != null ? Math.max(priceUSD - commissionUSD, 0) : null;
  const hasGain = commissionValue > 0 || commissionPercent > 0 || (commissionCOP ?? 0) > 0;
  const forcePublicPriceOption = commissionType === "included" || !hasGain;
  const publicCOP = priceCOP ?? (!isCopSale && exchangeRate && priceUSD != null ? Math.round(priceUSD * exchangeRate) : null);
  const publicUSD = isCopSale
    ? null
    : (priceUSD ?? (exchangeRate && priceCOP != null && exchangeRate > 0 ? priceCOP / exchangeRate : null));

  const passengerCount = Math.max(1, s?.passengers ?? 1);
const createTraveler = (idx: number): TravelerForm => ({
  id: undefined,
  firstName: "",
  lastName: "",
    documentType: "PASSPORT",
    documentNumber: "",
    birthDate: "",
    phone: idx === 0 ? "" : "",
    email: idx === 0 ? "" : "",
    address: idx === 0 ? "" : "",
    city: idx === 0 ? "" : "",
    country: idx === 0 ? (s?.originLabel ?? "") : "",
  });

  const [travelers, setTravelers] = useState<TravelerForm[]>(() =>
    Array.from({ length: passengerCount }, (_, idx) => createTraveler(idx))
  );
  const [priceOption, setPriceOption] = useState<'public' | 'net'>('public');
  const effectivePriceOption: "public" | "net" = forcePublicPriceOption ? "public" : priceOption;
  const [payment, setPayment] = useState<PaymentSelection>(() =>
    canUseAgencyCredit
      ? { platform: "agency", agencyCode: selectedAgencyCode ?? 1 }
      : { platform: "wompi", method: "CARD" }
  );
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContactForm>({ name: "", phone: "" });
  const [formErrors, setFormErrors] = useState<FieldErrors>({});
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [payloadPreview, setPayloadPreview] = useState<CheckoutPayload | null>(null);
  const [paymentFieldErrors, setPaymentFieldErrors] = useState<PaymentFieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassengerUploadModal, setShowPassengerUploadModal] = useState(false);
  const [isProcessingPassengerUpload, setIsProcessingPassengerUpload] = useState(false);
  const [passengerUploadError, setPassengerUploadError] = useState<string | null>(null);
  const [passengerUploadSuccess, setPassengerUploadSuccess] = useState<string | null>(null);
  const passengerFileInputRef = useRef<HTMLInputElement | null>(null);
  const lookupTimeoutsRef = useRef<Record<number, number | null>>({});
  const lookupInFlightRef = useRef<Record<number, string | null>>({});
  const lookupCacheRef = useRef<Map<string, TravelerForm>>(new Map());

  useEffect(() => {
    if (canUseAgencyCredit) return;
    setPayment((prev) => {
      if (prev.platform !== "agency") return prev;
      return { platform: "wompi", method: "CARD" };
    });
  }, [canUseAgencyCredit]);

  const updateTraveler = <K extends keyof TravelerForm>(index: number, key: K, value: TravelerForm[K]) => {
    setTravelers((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const applyTravelerAutofill = (index: number, data: Partial<TravelerForm>) => {
    setTravelers((prev) => {
      if (!prev[index]) return prev;
      const current = prev[index];
      const next = { ...current };
      const fillIfEmpty = <K extends keyof TravelerForm>(key: K, value?: TravelerForm[K]) => {
        if (value == null || String(value).trim() === "") return;
        if (String(current[key] ?? "").trim()) return;
        next[key] = value;
      };
      fillIfEmpty("firstName", data.firstName);
      fillIfEmpty("lastName", data.lastName);
      fillIfEmpty("birthDate", data.birthDate ? normalizeBirthDateFromApi(data.birthDate) : "");
      fillIfEmpty("phone", data.phone);
      fillIfEmpty("email", data.email);
      fillIfEmpty("address", data.address);
      fillIfEmpty("city", data.city);
      fillIfEmpty("country", data.country);
      const updated = [...prev];
      updated[index] = next;
      return updated;
    });
  };

  const pickLatestPurchaseId = (items: Array<{ id?: number; purchase_id?: number; emission_date?: string; start_date?: string }>) => {
    if (!items.length) return null;
    const toTime = (value?: string) => {
      if (!value) return null;
      const parsed = Date.parse(value);
      return Number.isNaN(parsed) ? null : parsed;
    };
    const sorted = [...items].sort((a, b) => {
      const aTime = toTime(a.emission_date) ?? toTime(a.start_date) ?? 0;
      const bTime = toTime(b.emission_date) ?? toTime(b.start_date) ?? 0;
      if (aTime !== bTime) return bTime - aTime;
      const aId = a.purchase_id ?? a.id ?? 0;
      const bId = b.purchase_id ?? b.id ?? 0;
      return bId - aId;
    });
    return sorted[0]?.purchase_id ?? sorted[0]?.id ?? null;
  };

  const lookupTravelerFromLastPurchase = async (index: number, documentType: string, documentNumber: string) => {
    const normalizedType = documentType.trim().toUpperCase();
    const normalizedNumber = documentNumber.trim();
    if (!normalizedType || !normalizedNumber) return;
    const key = `${normalizedType}|${normalizedNumber}`;
    if (lookupInFlightRef.current[index] === key) return;

    const cached = lookupCacheRef.current.get(key);
    if (cached) {
      applyTravelerAutofill(index, cached);
      return;
    }

    try {
      lookupInFlightRef.current[index] = key;
      const list = await insurancePurchaseService.listPurchases({
        document_number: normalizedNumber,
        document_type: normalizedType,
        latest: 1,
      });
      const purchaseId = pickLatestPurchaseId(list.data || []);
      if (!purchaseId) return;
      const detail = await insurancePurchaseService.get(purchaseId);
      const match = detail.travelers.find((traveler) => {
        const tDoc = traveler.documentNumber?.trim() ?? "";
        const tType = traveler.documentType?.trim().toUpperCase() ?? "";
        return tDoc === normalizedNumber && tType === normalizedType;
      });
      if (!match) return;
      const payload: TravelerForm = {
        id: undefined,
        firstName: match.firstName ?? "",
        lastName: match.lastName ?? "",
        documentType: normalizedType,
        documentNumber: normalizedNumber,
        birthDate: normalizeBirthDateFromApi(match.birthDate),
        phone: match.phone ?? "",
        email: match.email ?? "",
        address: match.address ?? "",
        city: match.city ?? "",
        country: match.country ?? "",
      };
      lookupCacheRef.current.set(key, payload);
      applyTravelerAutofill(index, payload);
    } catch (error) {
      console.error("No se pudo cargar el viajero para autocompletar", error);
    } finally {
      if (lookupInFlightRef.current[index] === key) {
        lookupInFlightRef.current[index] = null;
      }
    }
  };

  const scheduleTravelerLookup = (index: number, documentType: string, documentNumber: string) => {
    if (lookupTimeoutsRef.current[index]) {
      clearTimeout(lookupTimeoutsRef.current[index] as number);
    }
    const normalizedType = documentType.trim();
    const normalizedNumber = documentNumber.trim();
    if (!normalizedType || !normalizedNumber) return;
    lookupTimeoutsRef.current[index] = window.setTimeout(() => {
      void lookupTravelerFromLastPurchase(index, normalizedType, normalizedNumber);
    }, 500);
  };

  const travelerError = (index: number, key: keyof TravelerForm) => formErrors[`traveler-${index}-${String(key)}`];

  const emergencyError = (key: keyof EmergencyContactForm) => formErrors[`emergency-${String(key)}`];

  const formatDate = (d: Date) => d.toISOString().slice(0, 10);
  const calcAge = (d: string) => {
    if (!d) return null as number | null;
    const birth = new Date(d);
    if (isNaN(birth.getTime())) return null as number | null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age < 0 ? 0 : age;
  };

  const dobBoundsForAge = (age?: number | null) => {
    if (age == null) return { min: undefined as string | undefined, max: undefined as string | undefined };
    const today = new Date();
    const max = new Date(today); // most recent allowed date = turned "age" today
    max.setFullYear(max.getFullYear() - age);
    const min = new Date(max);
    min.setFullYear(min.getFullYear() - 1);
    min.setDate(min.getDate() + 1); // exclusive lower bound -> make inclusive by +1
    return { min: formatDate(min), max: formatDate(max) };
  };

  const validateAndBuildPayload = (): { errors: string[]; fieldErrors: FieldErrors; payload?: CheckoutPayload; paymentErrors?: PaymentFieldErrors } => {
    const fieldErrors: FieldErrors = {};
    const errors: string[] = [];

    const ensure = (condition: boolean, key: string, message: string) => {
      if (!condition) fieldErrors[key] = message;
    };

    travelers.forEach((traveler, idx) => {
      const key = (field: keyof TravelerForm) => `traveler-${idx}-${String(field)}`;
      ensure(!!cleanString(traveler.firstName), key("firstName"), "Este campo es obligatorio.");
      ensure(!!cleanString(traveler.lastName), key("lastName"), "Este campo es obligatorio.");
      ensure(!!cleanString(traveler.documentType), key("documentType"), "Selecciona un tipo de documento.");
      ensure(!!cleanString(traveler.documentNumber), key("documentNumber"), "Este campo es obligatorio.");
      if (!cleanString(traveler.birthDate)) {
        fieldErrors[key("birthDate")] = "Selecciona la fecha de nacimiento.";
      } else if (tripMode !== "groups" && s?.ages && s.ages[idx] != null) {
        const expectedAge = Number(s.ages[idx]);
        const realAge = calcAge(traveler.birthDate);
        if (realAge !== expectedAge) {
          fieldErrors[key("birthDate")] = `La fecha no coincide con la edad (${expectedAge} años).`;
        }
      }

      if (idx === 0) {
        const phone = cleanString(traveler.phone);
        if (!phone) {
          fieldErrors[key("phone")] = "Ingresa el número de teléfono.";
        } else if (!isValidPhone(phone)) {
          fieldErrors[key("phone")] = "Ingresa un número de teléfono válido.";
        }
        const email = cleanString(traveler.email);
        if (!email) {
          fieldErrors[key("email")] = "Este campo es obligatorio.";
        } else if (!isValidEmail(email)) {
          fieldErrors[key("email")] = "Ingresa un email válido.";
        }
        ensure(!!cleanString(traveler.address), key("address"), "Este campo es obligatorio.");
        ensure(!!cleanString(traveler.city), key("city"), "Este campo es obligatorio.");
        ensure(!!cleanString(traveler.country), key("country"), "Este campo es obligatorio.");
      }
    });

    ensure(!!cleanString(emergencyContact.name), "emergency-name", "Este campo es obligatorio.");
    const emergencyPhone = cleanString(emergencyContact.phone);
    if (!emergencyPhone) {
      fieldErrors["emergency-phone"] = "Ingresa el número de contacto.";
    } else if (!isValidPhone(emergencyPhone)) {
      fieldErrors["emergency-phone"] = "Ingresa un número de teléfono válido.";
    }

    const paymentValidation = validatePaymentSelection(payment, { allowAgencyCredit: canUseAgencyCredit });
    if (paymentValidation.issues.length > 0) {
      errors.push(...paymentValidation.issues);
    }
    const paymentErrors = paymentValidation.fieldErrors;

    if (!s) {
      errors.push("La información de la cotización no está disponible.");
    }

    if (Object.keys(fieldErrors).length > 0) {
      errors.push("Verifica la información de los pasajeros y contactos.");
    }

    if (errors.length > 0) {
      return { errors, fieldErrors, paymentErrors };
    }

    const planTypeNameResolved = s?.planTypeName ?? planTypeTitle ?? null;

    const travelerPayload: TravelerPayload[] = travelers.map((traveler, idx) => {
      const trimmed = {
        firstName: cleanString(traveler.firstName),
        lastName: cleanString(traveler.lastName),
        documentType: cleanString(traveler.documentType),
        documentNumber: cleanString(traveler.documentNumber),
        birthDate: traveler.birthDate,
        phone: cleanString(traveler.phone),
        email: cleanString(traveler.email),
        address: cleanString(traveler.address),
        city: cleanString(traveler.city),
        country: cleanString(traveler.country),
      };
      return {
        id: traveler.id,
        index: idx + 1,
        firstName: trimmed.firstName,
        lastName: trimmed.lastName,
        documentType: trimmed.documentType,
        documentNumber: trimmed.documentNumber,
        birthDate: traveler.birthDate,
        age: calcAge(traveler.birthDate),
        phone: trimmed.phone || undefined,
        email: trimmed.email || undefined,
        address: trimmed.address || undefined,
        city: trimmed.city || undefined,
        country: trimmed.country || undefined,
      };
    });

    const payloadCurrency: "COP" | "USD" = isCopSale ? "COP" : "USD";
    const payloadExchangeRate = payloadCurrency === "COP"
      ? 1
      : (exchangeRate && exchangeRate > 0 ? exchangeRate : null);

    const basePaymentPayload = normalizePaymentPayload(payment);
    const paymentPayload: PaymentPayload = {
      ...basePaymentPayload,
      priceOption: effectivePriceOption,
      currency: payloadCurrency,
      exchangeRate: payloadExchangeRate,
    };

    const agencyFromPayment = payment.platform === "agency" ? payment.agencyCode ?? null : null;
    const combinedAgency = selectedAgencyId ?? agencyFromPayment ?? null;
    const payload: CheckoutPayload = {
      originName: s?.originLabel,
      originValue: restoreForm?.origin?.value ?? null,
      destinationName: s?.destinationLabel,
      destinationValue: restoreForm?.destination?.value ?? null,
      startDate: s?.startDate,
      endDate: s?.endDate,
      passengerCount,
      emergencyContactName: cleanString(emergencyContact.name),
      emergencyContactPhone: cleanString(emergencyContact.phone),
      planId: s?.planId ?? null,
      planName: s?.planName ?? s?.plan ?? null,
      planTypeId: planTypeIdValue ?? null,
      planTypeName: planTypeNameResolved,
      currency: payloadCurrency,
      exchangeRate: payloadExchangeRate,
      travelers: travelerPayload,
      payment: paymentPayload,
      agency: combinedAgency,
      page: combinedAgency ? null : pageValue ?? null,
    };

    return { errors, fieldErrors, payload, paymentErrors };
  };

  const handleSubmit = async () => {
    const { errors, fieldErrors, payload, paymentErrors = {} } = validateAndBuildPayload();
    setFormErrors(fieldErrors);
    setSubmitErrors(errors);
    setPaymentFieldErrors(paymentErrors);
    setSubmitSuccess(false);
    if (!payload) {
      setPayloadPreview(null);
      return;
    }

    try {
      window.dispatchEvent(new CustomEvent('loader:start'));
      setIsSubmitting(true);
      setSubmitErrors([]);
      const response = await insurancePurchaseService.create(payload);
      const redirectUrl = (response.redirectUrl || response.redirect_url) as string | undefined;
      const purchaseId = (response.purchaseId ?? response.id) as string | number | undefined;
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      if (purchaseId != null) {
        navigate(`/insurance/purchases/${purchaseId}`);
        return;
      }
      setPayloadPreview(payload);
      setSubmitSuccess(true);
      console.log("checkout payload", payload, response);
    } catch (error) {
      console.error("Error al crear la compra de seguro", error);
      setSubmitErrors(["No se pudo completar la compra. Inténtalo nuevamente." ]);
      setSubmitSuccess(false);
    } finally {
      setIsSubmitting(false);
      window.dispatchEvent(new CustomEvent('loader:end'));
    }
  };

  const resetPassengerUploadState = () => {
    setPassengerUploadError(null);
    setPassengerUploadSuccess(null);
  };

  const openPassengerUploadModal = () => {
    resetPassengerUploadState();
    setShowPassengerUploadModal(true);
    if (passengerFileInputRef.current) {
      passengerFileInputRef.current.value = "";
    }
  };

  const closePassengerUploadModal = () => {
    setShowPassengerUploadModal(false);
    setIsProcessingPassengerUpload(false);
  };

  const handleDownloadPassengerTemplate = () => {
    const worksheetData = [
      {
        [passengerColumnTitle.firstName]: "MARIA CAMILA",
        [passengerColumnTitle.lastName]: "PEREZ LOPEZ",
        [passengerColumnTitle.documentNumber]: "123456789",
        [passengerColumnTitle.birthDate]: "1990-05-12",
      },
      {
        [passengerColumnTitle.firstName]: "",
        [passengerColumnTitle.lastName]: "",
        [passengerColumnTitle.documentNumber]: "",
        [passengerColumnTitle.birthDate]: "",
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(worksheetData, { skipHeader: false });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Pasajeros");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "plantilla_pasajeros.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePassengerFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    resetPassengerUploadState();
    setIsProcessingPassengerUpload(true);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      if (!extension || !["xlsx", "xls"].includes(extension)) {
        throw new Error("El archivo debe tener formato Excel (.xlsx o .xls).");
      }

      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) {
        throw new Error("El archivo no contiene hojas.");
      }
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        throw new Error("No se encontró información en la primera hoja.");
      }

      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
        raw: false,
        dateNF: "yyyy-MM-dd",
        blankrows: false,
      });

      if (rawRows.length === 0) {
        throw new Error("La hoja no contiene datos de pasajeros.");
      }

      const missingColumns = PASSENGER_TEMPLATE_COLUMNS
        .map((column) => column.title)
        .filter((title) => !(title in rawRows[0]));
      if (missingColumns.length > 0) {
        throw new Error(`Faltan las columnas requeridas: ${missingColumns.join(", ")}.`);
      }

      const normalizedRows = rawRows
        .map((row) => ({
          firstName: String(row[passengerColumnTitle.firstName] ?? "").trim(),
          lastName: String(row[passengerColumnTitle.lastName] ?? "").trim(),
          documentNumber: String(row[passengerColumnTitle.documentNumber] ?? "").trim(),
          birthDate: normalizeBirthDateFromExcel(row[passengerColumnTitle.birthDate]),
        }))
        .filter((row) => row.firstName || row.lastName || row.documentNumber || row.birthDate);

      if (normalizedRows.length === 0) {
        throw new Error("No se encontraron filas con datos válidos.");
      }

      let rowsUsed = 0;
      let travelerCount = 0;
      setTravelers((prev) => {
        travelerCount = prev.length;
        rowsUsed = Math.min(normalizedRows.length, prev.length);
        return prev.map((traveler, idx) => {
          const row = normalizedRows[idx];
          if (!row) return traveler;
          return {
            ...traveler,
            firstName: row.firstName || traveler.firstName,
            lastName: row.lastName || traveler.lastName,
            documentNumber: row.documentNumber || traveler.documentNumber,
            birthDate: row.birthDate || traveler.birthDate,
          };
        });
      });

      const extraRows = Math.max(normalizedRows.length - travelerCount, 0);
      const missingRows = Math.max(travelerCount - normalizedRows.length, 0);
      let successMessage = `Se cargaron datos para ${rowsUsed} pasajero${rowsUsed === 1 ? "" : "s"}.`;
      if (extraRows > 0) {
        successMessage += ` Se ignoraron ${extraRows} fila${extraRows === 1 ? "" : "s"} adicional${extraRows === 1 ? "" : "es"}.`;
      }
      if (missingRows > 0) {
        successMessage += ` Aún faltan ${missingRows} pasajero${missingRows === 1 ? "" : "s"} por completar.`;
      }
      setPassengerUploadSuccess(successMessage);
    } catch (error) {
      console.error("Error al procesar el archivo de pasajeros", error);
      setPassengerUploadError(error instanceof Error ? error.message : "No se pudo procesar el archivo.");
    } finally {
      setIsProcessingPassengerUpload(false);
      if (passengerFileInputRef.current) {
        passengerFileInputRef.current.value = "";
      }
      input.value = "";
    }
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      {showPassengerUploadModal && (
        <div className="modal modal-open" onClick={closePassengerUploadModal}>
          <div className="modal-box max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Cargar pasajeros desde Excel</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Descarga la plantilla, completa la información de cada pasajero y súbela para llenar el formulario de forma automática.
                </p>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={closePassengerUploadModal}>
                <FaTimes />
              </button>
            </div>

            <div className="mt-4 bg-base-200 rounded-xl p-4 text-sm space-y-2">
              <div className="font-semibold text-gray-700">Columnas requeridas</div>
              <ul className="list-disc list-inside space-y-1">
                {PASSENGER_TEMPLATE_COLUMNS.map((column) => (
                  <li key={column.key}>
                    <span className="font-medium">{column.title}:</span> {column.description}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" className="btn btn-outline btn-sm" onClick={handleDownloadPassengerTemplate}>
                <FaDownload className="mr-2" /> Descargar plantilla
              </button>
              <label className={`btn btn-primary btn-sm ${isProcessingPassengerUpload ? "loading" : ""}`}>
                {!isProcessingPassengerUpload && <FaUpload className="mr-2" />}
                {isProcessingPassengerUpload ? "Procesando..." : "Seleccionar archivo"}
                <input
                  ref={passengerFileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handlePassengerFileChange}
                  disabled={isProcessingPassengerUpload}
                />
              </label>
            </div>

            {passengerUploadError && (
              <div className="alert alert-error mt-4 text-sm">
                <span>{passengerUploadError}</span>
              </div>
            )}
            {passengerUploadSuccess && (
              <div className="alert alert-success mt-4 text-sm">
                <span>{passengerUploadSuccess}</span>
              </div>
            )}

            <div className="modal-action">
              <button type="button" className="btn btn-ghost" onClick={closePassengerUploadModal}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header actions - pill bar with centered title and underline */}
      <div className="rounded-3xl bg-[var(--color-secondary)] text-[var(--color-primary-content)] px-4 md:px-6 py-4 md:py-5 shadow flex items-center gap-3">
        <button
          className="btn btn-ghost btn-sm text-white"
          onClick={() => {
            const restore = state?.restore;
            if (restore) {
              navigate("/insurance", { state: { restore } });
            } else {
              navigate(-1);
            }
          }}
        >
          <FaArrowLeft className="mr-2" /> Volver
        </button>
        <div className="flex-1 text-center">
          <div className="font-medium md:text-lg">Emisión {planTypeTitle}</div>
          <div className="mx-auto mt-2 h-1 w-12 rounded-full bg-[var(--color-primary)]"></div>
        </div>
        <button
          className="btn btn-sm rounded-full bg-[var(--color-primary)] text-[var(--color-primary-content)] border-none hover:opacity-90"
          onClick={openPassengerUploadModal}
        >
          Cargar archivo pasajeros
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left summary */}
        <aside className="lg:col-span-3 bg-white rounded-2xl shadow p-4 space-y-3 text-sm">
          <div>
            <div className="text-gray-500">Origen</div>
            <div className="font-semibold">{s?.originLabel ?? "-"}</div>
          </div>
          <div>
            <div className="text-gray-500">Destino</div>
            <div className="font-semibold">{s?.destinationLabel ?? "-"}</div>
          </div>
          <div>
            <div className="text-gray-500">Producto elegido</div>
            <div className="font-semibold">{s?.planName ?? s?.plan ?? "-"}</div>
          </div>
          <div>
            <div className="text-gray-500">Tipo de plan</div>
            <div className="font-semibold">{planTypeTitle}</div>
          </div>
          <div>
            <div className="text-gray-500">Agencia</div>
            <div className="font-semibold">{selectedAgencyName ?? "-"}</div>
          </div>
          <div>
            <div className="text-gray-500">Fecha inicio vigencia</div>
            <div className="font-semibold">{s?.startDate ?? "-"}</div>
          </div>
          <div>
            <div className="text-gray-500">Fecha fin vigencia</div>
            <div className="font-semibold">{s?.endDate ?? "-"}</div>
          </div>
          <div>
            <div className="text-gray-500">Número de pasajeros</div>
            <div className="font-semibold">{s?.passengers ?? 1}</div>
          </div>
        </aside>

        {/* Main content */}
        <section className="lg:col-span-9 space-y-4">
          {submitErrors.length > 0 && (
            <div className="alert alert-error">
              <div className="flex flex-col gap-1 text-sm">
                {submitErrors.map((err, idx) => (
                  <span key={idx}>• {err}</span>
                ))}
              </div>
            </div>
          )}

          {submitSuccess && payloadPreview && (
            <div className="alert alert-success flex flex-col gap-2">
              <span className="font-medium">Formulario validado correctamente.</span>
              <pre className="bg-base-200 rounded p-3 text-xs whitespace-pre-wrap break-words">
                {JSON.stringify(payloadPreview, null, 2)}
              </pre>
            </div>
          )}

          {travelers.map((traveler, idx) => {
            const targetAge = s?.ages && s.ages[idx] != null ? Number(s.ages[idx]) : undefined;
            const { min, max } = dobBoundsForAge(targetAge);
            const firstNameError = travelerError(idx, "firstName");
            const lastNameError = travelerError(idx, "lastName");
            const documentTypeError = travelerError(idx, "documentType");
            const documentNumberError = travelerError(idx, "documentNumber");
            const birthDateError = travelerError(idx, "birthDate");
            const phoneError = travelerError(idx, "phone");
            const emailError = travelerError(idx, "email");
            const addressError = travelerError(idx, "address");
            const cityError = travelerError(idx, "city");
            const countryError = travelerError(idx, "country");
            const baseId = `traveler-${idx}`;
            const firstNameId = `${baseId}-first-name`;
            const lastNameId = `${baseId}-last-name`;
            const documentTypeId = `${baseId}-document-type`;
            const documentNumberId = `${baseId}-document-number`;
            const birthDateId = `${baseId}-birth-date`;
            const phoneId = `${baseId}-phone`;
            const emailId = `${baseId}-email`;
            const addressId = `${baseId}-address`;
            const cityId = `${baseId}-city`;
            const countryId = `${baseId}-country`;

            return (
              <div key={idx} className="bg-white rounded-2xl shadow p-5">
                <div className="w-full flex items-center gap-2 text-[var(--color-secondary)] font-semibold mb-3">
                  <span className="w-6 h-6 rounded-full border border-[var(--color-primary)] text-[var(--color-primary)] flex items-center justify-center">
                    <FaUser size={12} />
                  </span>
                  <span className="text-lg">
                    {idx === 0 ? "Viajero principal" : `Pasajero ${idx + 1}`} {targetAge != null ? `(${targetAge} años)` : ""}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-3 gap-2 md:col-span-2">
                    <div className="form-control col-span-1">
                      <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor={documentTypeId}>Tipo doc</label>
                      <select
                        className={`select select-bordered w-full ${documentTypeError ? "select-error" : ""}`}
                        id={documentTypeId}
                        value={traveler.documentType}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        updateTraveler(idx, "documentType", nextValue);
                        scheduleTravelerLookup(idx, nextValue, traveler.documentNumber);
                      }}
                      >
                        <option value="">Selecciona</option>
                        <option value="PASSPORT">Pasaporte</option>
                        <option value="CC">Cédula de ciudadanía</option>
                        <option value="CE">Cédula de extranjería</option>
                      </select>
                      {documentTypeError && <span className="text-xs text-error mt-1">{documentTypeError}</span>}
                    </div>
                    <div className="form-control col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor={documentNumberId}>Número</label>
                      <input
                        className={`input input-bordered w-full ${documentNumberError ? "input-error" : ""}`}
                        id={documentNumberId}
                        value={traveler.documentNumber}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        updateTraveler(idx, "documentNumber", nextValue);
                        scheduleTravelerLookup(idx, traveler.documentType, nextValue);
                      }}
                      />
                      {documentNumberError && <span className="text-xs text-error mt-1">{documentNumberError}</span>}
                    </div>
                  </div>

                  <div className="form-control">
                    <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor={firstNameId}>Nombres</label>
                    <input
                      className={`input input-bordered w-full ${firstNameError ? "input-error" : ""}`}
                      id={firstNameId}
                      value={traveler.firstName}
                      onChange={(e) => updateTraveler(idx, "firstName", e.target.value)}
                    />
                    {firstNameError && <span className="text-xs text-error mt-1">{firstNameError}</span>}
                  </div>

                  <div className="form-control">
                    <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor={lastNameId}>Apellidos</label>
                    <input
                      className={`input input-bordered w-full ${lastNameError ? "input-error" : ""}`}
                      id={lastNameId}
                      value={traveler.lastName}
                      onChange={(e) => updateTraveler(idx, "lastName", e.target.value)}
                    />
                    {lastNameError && <span className="text-xs text-error mt-1">{lastNameError}</span>}
                  </div>

                  <div className="form-control">
                    <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor={birthDateId}>Fecha de nacimiento</label>
                    <input
                      type="date"
                      className={`input input-bordered w-full ${birthDateError ? "input-error" : ""}`}
                      min={min}
                      max={max}
                      id={birthDateId}
                      value={traveler.birthDate}
                      onChange={(e) => updateTraveler(idx, "birthDate", e.target.value)}
                    />
                    {birthDateError && <span className="text-xs text-error mt-1">{birthDateError}</span>}
                  </div>

                  {idx === 0 && (
                    <>
                      <div className="form-control">
                        <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor={phoneId}>Teléfono</label>
                        <input
                          className={`input input-bordered w-full ${phoneError ? "input-error" : ""}`}
                          inputMode="numeric"
                          pattern="\\d*"
                          id={phoneId}
                          value={traveler.phone}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 20);
                            updateTraveler(idx, "phone", digitsOnly);
                          }}
                        />
                        {phoneError && <span className="text-xs text-error mt-1">{phoneError}</span>}
                      </div>
                      <div className="form-control">
                        <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor={emailId}>Email</label>
                        <input
                          type="email"
                          className={`input input-bordered w-full ${emailError ? "input-error" : ""}`}
                          id={emailId}
                          value={traveler.email}
                          onChange={(e) => updateTraveler(idx, "email", e.target.value)}
                        />
                        {emailError && <span className="text-xs text-error mt-1">{emailError}</span>}
                      </div>
                      <div className="form-control md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor={addressId}>Dirección</label>
                        <input
                          className={`input input-bordered w-full ${addressError ? "input-error" : ""}`}
                          id={addressId}
                          value={traveler.address}
                          onChange={(e) => updateTraveler(idx, "address", e.target.value)}
                        />
                        {addressError && <span className="text-xs text-error mt-1">{addressError}</span>}
                      </div>
                      <div className="form-control">
                        <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor={cityId}>Ciudad</label>
                        <input
                          className={`input input-bordered w-full ${cityError ? "input-error" : ""}`}
                          id={cityId}
                          value={traveler.city}
                          onChange={(e) => updateTraveler(idx, "city", e.target.value)}
                        />
                        {cityError && <span className="text-xs text-error mt-1">{cityError}</span>}
                      </div>
                      <div className="form-control">
                        <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor={countryId}>País</label>
                        <input
                          className={`input input-bordered w-full ${countryError ? "input-error" : ""}`}
                          id={countryId}
                          value={traveler.country}
                          onChange={(e) => updateTraveler(idx, "country", e.target.value)}
                        />
                        {countryError && <span className="text-xs text-error mt-1">{countryError}</span>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {/* Contacto emergencias */}
          <div className="bg-white rounded-2xl shadow p-5">
            <div className="font-semibold text-[var(--color-secondary)] mb-3">Contacto de emergencia</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="emergency-name">Nombre</label>
                <input
                  id="emergency-name"
                  className={`input input-bordered w-full ${emergencyError("name") ? "input-error" : ""}`}
                  placeholder="Nombre del contacto"
                  value={emergencyContact.name}
                  onChange={(e) => setEmergencyContact((prev) => ({ ...prev, name: e.target.value }))}
                />
                {emergencyError("name") && <span className="text-xs text-error mt-1">{emergencyError("name")}</span>}
              </div>
              <div className="form-control">
                <label className="block text-sm font-semibold text-gray-700 mb-1" htmlFor="emergency-phone">Teléfono</label>
                <input
                  id="emergency-phone"
                  className={`input input-bordered w-full ${emergencyError("phone") ? "input-error" : ""}`}
                  placeholder="Número de contacto"
                  inputMode="numeric"
                  pattern="\\d*"
                  value={emergencyContact.phone}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 20);
                    setEmergencyContact((prev) => ({ ...prev, phone: digitsOnly }));
                  }}
                />
                {emergencyError("phone") && <span className="text-xs text-error mt-1">{emergencyError("phone")}</span>}
              </div>
            </div>
          </div>

          {/* Opción de pago */}
          <div className="bg-gray-100 rounded-2xl shadow p-5">
            <div className="font-semibold text-[var(--color-secondary)] mb-4">Opción de pago</div>
            <div className={`grid grid-cols-1 gap-4 ${forcePublicPriceOption ? "" : "md:grid-cols-2"}`}>
              <button
                type="button"
                onClick={() => {
                  if (!forcePublicPriceOption) {
                    setPriceOption('public');
                  }
                }}
                className={`text-left rounded-xl border p-4 md:p-5 bg-white w-full transition shadow-sm ${effectivePriceOption === 'public' ? 'border-[var(--color-secondary)] ring-2 ring-[var(--color-primary)]' : 'border-gray-300 hover:border-[var(--color-primary)]'} ${forcePublicPriceOption ? "cursor-default" : "cursor-pointer"}`}
                aria-pressed={effectivePriceOption === 'public'}
              >
                {!forcePublicPriceOption && (
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`w-4 h-4 rounded-full border ${effectivePriceOption === 'public' ? 'bg-[var(--color-secondary)] border-[var(--color-secondary)]' : 'border-[var(--color-secondary)]'}`} />
                    <span className="font-medium text-sm md:text-base">Pagar valor venta público</span>
                  </div>
                )}
                <div className={`${forcePublicPriceOption ? "text-center py-2" : "mt-2 text-center"}`}>
                  {!forcePublicPriceOption && <div className="text-gray-600">Costo de plan</div>}
                  <div className="text-2xl font-extrabold text-[var(--color-secondary)]">
                    {publicCOP !== null ? currencyCOP(publicCOP) : '-'}
                  </div>
                  <div className="text-sm text-[var(--color-primary)] font-semibold">
                    {publicUSD !== null ? currencyUSD(publicUSD) : '-'}
                  </div>
                </div>
              </button>

              {!forcePublicPriceOption && (
                <button
                  type="button"
                  onClick={() => setPriceOption('net')}
                  className={`text-left rounded-xl border p-4 md:p-5 bg-white w-full cursor-pointer transition shadow-sm ${effectivePriceOption === 'net' ? 'border-[var(--color-secondary)] ring-2 ring-[var(--color-primary)]' : 'border-gray-300 hover:border-[var(--color-primary)]'}`}
                  aria-pressed={effectivePriceOption === 'net'}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`w-4 h-4 rounded-full border ${effectivePriceOption === 'net' ? 'bg-[var(--color-secondary)] border-[var(--color-secondary)]' : 'border-[var(--color-secondary)]'}`} />
                    <span className="font-medium text-sm md:text-base">Pagar valor neto</span>
                  </div>
                  {commissionCOP != null && commissionCOP > 0 && (
                    <div className="text-xs text-gray-600 -mt-1 mb-1">Tu ganancia para esta venta es {currencyCOP(commissionCOP)}</div>
                  )}
                  <div className="mt-2 text-center">
                    <div className="text-gray-600">Valor neto</div>
                    <div className="text-2xl font-extrabold text-[var(--color-secondary)]">
                      {netCOP !== null ? currencyCOP(netCOP) : netUSD !== null ? currencyUSD(netUSD) : '-'}
                    </div>
                    {netUSD !== null && (
                      <div className="text-sm text-[var(--color-primary)] font-semibold">{currencyUSD(netUSD)}</div>
                    )}
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Medio de pago */}
          <div className="bg-white rounded-2xl shadow p-5">
            <div className="font-semibold text-[var(--color-secondary)] mb-4">Medio de pago</div>
            <PaymentMethodSelector
              value={payment}
              onChange={setPayment}
              errors={paymentFieldErrors}
              allowAgencyCredit={canUseAgencyCredit}
              agencyCode={selectedAgencyCode}
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              className="btn bg-[var(--color-primary)] hover:opacity-90 border-none text-[var(--color-primary-content)] px-10 rounded-full"
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Procesando..." : "Pagar"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CheckoutPage;
