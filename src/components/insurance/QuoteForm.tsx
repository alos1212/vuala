import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Select from "react-select";
import type { SingleValue, FormatOptionLabelMeta } from "react-select";
import { FaCalendar, FaMinus, FaPlus, FaCalculator, FaTimes, FaThLarge, FaList } from "react-icons/fa";
import "react-day-picker/dist/style.css";
import { es } from "date-fns/locale";
import { format, addMonths, addYears } from "date-fns";
import { DayPicker } from "react-day-picker";
import type { DateRange as DayPickerRange } from "react-day-picker";
import { geoService } from "../../services/geoService";
import { agencyService } from "../../services/agencyService";
import { insuranceService } from "../../services/insuranceService";
import ResultCard from "./ResultCard";
import type { InsuranceSearchParams, InsuranceSearchResult } from "../../types/insuranceSearch";
import type { InsuranceComparativeResponse } from "../../types/insuranceComparative";
import { insurancePlanTypeService } from "../../services/insurancePlanTypeService";
import type { InsurancePlanType, PlanPeriodicity } from "../../types/insurancePlanType";
import { usePageStore } from "../../stores/usePageStore";
import { useAuthStore } from "../../stores/authStore";
import type { GeoSelect } from "../../types/zone";
import type { Agency } from "../../types/agency";
interface SelectOption { value: number | string; label: string; type?: GeoSelect["type"]; }
interface TravelDateRange { startDate: Date; endDate: Date; key: string }
type TripMode = "travelers" | "groups";
type LanguageOption = "es" | "en";
type QuoteSearchParams = InsuranceSearchParams & { trip_mode?: TripMode };
type AgencySearchConfig = Pick<Agency, "allows_passengers" | "allows_groups" | "is_domestic" | "is_international">;

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SELECTION_LIMIT = 3;
const RESET_ON_SELECT = true;

const parseISODateLocal = (value: string): Date => {
  const parts = value.split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return new Date(value);
  const [year, month, day] = parts;
  return new Date(year, month - 1, day);
};

const toLocalStartOfDay = (value?: Date): Date => {
  const base = value ? new Date(value.getTime()) : new Date();
  return new Date(base.getFullYear(), base.getMonth(), base.getDate());
};

const QuoteForm2: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation() as any;
  const [geoOptions, setGeoOptions] = useState<SelectOption[]>([]);
  const [origin, setOrigin] = useState<SelectOption | null>(null);
  const [destination, setDestination] = useState<SelectOption | null>(null);
  const [travelDates, setTravelDates] = useState<TravelDateRange[]>([
    { startDate: toLocalStartOfDay(new Date()), endDate: toLocalStartOfDay(new Date()), key: "selection" },
  ]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState<Date>(toLocalStartOfDay(new Date()));
  const [passengerCount, setPassengerCount] = useState(1);
  const [ages, setAges] = useState<string[]>([""]);
  const [isMobile, setIsMobile] = useState(false);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [fieldValidity, setFieldValidity] = useState({
    origin: true,
    destination: true,
    dates: true,
    passengers: true,
    ages: true,
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InsuranceSearchResult[] | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [planTypes, setPlanTypes] = useState<InsurancePlanType[]>([]);
  const [selectedPlanType, setSelectedPlanType] = useState<string>("");
  const [selectedAgency, setSelectedAgency] = useState<string>("0");
  const [agencyOptions, setAgencyOptions] = useState<Agency[]>([]);
  const [agenciesLoading, setAgenciesLoading] = useState(false);
  const [myAgencyConfig, setMyAgencyConfig] = useState<AgencySearchConfig | null>(null);
  const [selectedPlanIds, setSelectedPlanIds] = useState<number[]>([]);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [lastSearchParams, setLastSearchParams] = useState<QuoteSearchParams | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>("es");
  const [showComparativeModal, setShowComparativeModal] = useState(false);
  const [comparativeLoading, setComparativeLoading] = useState(false);
  const [comparativeError, setComparativeError] = useState<string | null>(null);
  const [comparativeData, setComparativeData] = useState<InsuranceComparativeResponse | null>(null);
  const [resultsView, setResultsView] = useState<"grid" | "list">("grid");
  const originRef = useRef<SelectOption | null>(origin);
  const destinationRef = useRef<SelectOption | null>(destination);
  const previousGeoScopeRef = useRef<"national" | "international" | null>(null);
  const countryId = usePageStore((state) => state.countryId);
  const page = usePageStore((state) => state.page);
  const user = useAuthStore((state) => state.user);
  const [tripMode, setTripMode] = useState<TripMode>("travelers");
  const isAgencyUser = Boolean(
    user?.agency_id ||
    (Array.isArray(user?.role)
      ? user.role.some((role) => role?.type === 1)
      : (user as any)?.role?.type === 1)
  );
  const userAgencyId = user?.agency_id != null ? String(user.agency_id) : "";
  const effectiveSelectedAgency = isAgencyUser ? (userAgencyId || "0") : (selectedAgency || "0");
  const selectedAgencyConfig = useMemo<AgencySearchConfig | null>(() => {
    if (isAgencyUser) return myAgencyConfig;

    const numericAgencyId = Number(effectiveSelectedAgency);
    if (!Number.isFinite(numericAgencyId) || numericAgencyId <= 0) return null;

    const agency = agencyOptions.find((item) => Number(item.id) === numericAgencyId);
    if (!agency) return null;

    return {
      allows_passengers: agency.allows_passengers,
      allows_groups: agency.allows_groups,
      is_domestic: agency.is_domestic,
      is_international: agency.is_international,
    };
  }, [isAgencyUser, myAgencyConfig, agencyOptions, effectiveSelectedAgency]);

  const tripModeOptions = useMemo<Array<{ value: TripMode; label: string }>>(() => {
    if (!selectedAgencyConfig) {
      return [
        { value: "travelers", label: "Viajeros" },
        { value: "groups", label: "Grupos" },
      ];
    }

    const options: Array<{ value: TripMode; label: string }> = [];
    if (Boolean(selectedAgencyConfig.allows_passengers)) {
      options.push({ value: "travelers", label: "Viajeros" });
    }
    if (Boolean(selectedAgencyConfig.allows_groups)) {
      options.push({ value: "groups", label: "Grupos" });
    }
    return options;
  }, [selectedAgencyConfig]);

  const hasAvailableTripModes = tripModeOptions.length > 0;
  const availablePlanTypes = useMemo<InsurancePlanType[]>(() => {
    if (!selectedAgencyConfig) return planTypes;

    const allowsNational = Boolean(selectedAgencyConfig.is_domestic);
    const allowsInternational = Boolean(selectedAgencyConfig.is_international);

    if (allowsNational && allowsInternational) return planTypes;
    if (allowsNational) return planTypes.filter((planType) => planType.geo_scope === "national");
    if (allowsInternational) return planTypes.filter((planType) => planType.geo_scope === "international");
    return [];
  }, [selectedAgencyConfig, planTypes]);
  const hasPlanTypeScopeConflict = Boolean(selectedAgencyConfig && planTypes.length > 0 && availablePlanTypes.length === 0);

const effectivePlanTypeId = selectedPlanType || (availablePlanTypes.length > 0 ? String(availablePlanTypes[0].id) : "");
const selectedPlanTypeData = availablePlanTypes.find((pt) => String(pt.id) === effectivePlanTypeId);
const currentPlanTypeName = selectedPlanTypeData?.name
  ?? availablePlanTypes[0]?.name
  ?? "Internacional";
const currentPeriodicity: PlanPeriodicity = selectedPlanTypeData?.periodicity ?? "day";
const selectedPlanTypeName = selectedPlanTypeData?.name ?? "";
const normalizedPlanTypeName = selectedPlanTypeName
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "");
const planTypeNameTokens = normalizedPlanTypeName.split(/[^a-z]+/).filter(Boolean);
const isNationalPlanType =
  selectedPlanTypeData?.geo_scope != null
    ? selectedPlanTypeData.geo_scope === "national"
    : planTypeNameTokens.includes("nacional") || planTypeNameTokens.includes("national");

const computePeriodicEndDate = (start: Date, periodicity: PlanPeriodicity): Date => {
  const safeStart = start instanceof Date ? new Date(start.getTime()) : new Date();
  switch (periodicity) {
    case "month":
      return addMonths(safeStart, 1);
    case "year":
      // End on the day before the same date next year (inclusive year coverage)
      return new Date(addYears(safeStart, 1).getTime() - DAY_IN_MS);
    default:
      return new Date(safeStart.getTime());
  }
};

const calculateTotalDays = (
  startDate: Date | undefined,
  endDate: Date | undefined,
  periodicity: PlanPeriodicity,
): number => {
  if (!(startDate instanceof Date) || Number.isNaN(startDate.getTime())) return 0;
  if (!(endDate instanceof Date) || Number.isNaN(endDate.getTime())) return 0;
  if (periodicity === "year") return 365;
  const diff = endDate.getTime() - startDate.getTime();
  if (diff < 0) return 0;
  return Math.max(1, Math.ceil(diff / DAY_IN_MS) + 1);
};

  const geoSortOrder: Record<GeoSelect["type"], number> = {
    continent: 0,
    country: 1,
    state: 2,
    city: 3,
  };

  const mapAndSortGeoOptions = (items: GeoSelect[], fallbackType?: GeoSelect["type"]): SelectOption[] => {
    const mapped = items.map((item) => ({
      value: item.id,
      label: item.name,
      type: item.type ?? fallbackType,
    }));
    mapped.sort((a, b) => {
      const orderA = geoSortOrder[a.type ?? "continent"] ?? 99;
      const orderB = geoSortOrder[b.type ?? "continent"] ?? 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.label.localeCompare(b.label, "es", { sensitivity: "base" });
    });
    return mapped;
  };

const geoTypeLabels: Record<NonNullable<SelectOption["type"]>, string> = {
  continent: "Continente",
  country: "País",
  state: "Estado",
  city: "Ciudad",
  };

  const handlePlanTypeChange = (value: string) => {
    setSelectedPlanType(value);
    const plan = planTypes.find((pt) => String(pt.id) === value);
    const periodicity: PlanPeriodicity = plan?.periodicity ?? "day";
    if (periodicity === "day") {
      const startDate = travelDates[0]?.startDate ? new Date(travelDates[0].startDate.getTime()) : new Date();
      const endDate = travelDates[0]?.endDate;
      if (!endDate || endDate < startDate) {
        setTravelDates([{ key: "selection", startDate, endDate: new Date(startDate.getTime()) }]);
      }
      return;
    }
    const startDate = travelDates[0]?.startDate ? new Date(travelDates[0].startDate.getTime()) : new Date();
    const endDate = computePeriodicEndDate(startDate, periodicity);
    setTravelDates([{ key: "selection", startDate, endDate }]);
  };

  const formatGeoOptionLabel = (option: SelectOption, meta: FormatOptionLabelMeta<SelectOption>) => {
    const typeLabel = option.type ? geoTypeLabels[option.type] ?? option.type : null;
    if (!typeLabel) return option.label;
    if (meta.context === "value") {
      return (
        <div className="flex items-center gap-2">
          <span>{option.label}</span>
          <span className="badge badge-outline text-[10px] uppercase">{typeLabel}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between">
        <span>{option.label}</span>
        <span className="text-xs uppercase text-gray-500">{typeLabel}</span>
      </div>
    );
  };
  // Calculadora de edad
  const [showAgeCalc, setShowAgeCalc] = useState(false);
  const [dob, setDob] = useState<string>("");
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

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

useEffect(() => {
  originRef.current = origin;
}, [origin]);

useEffect(() => {
  destinationRef.current = destination;
}, [destination]);

  useEffect(() => {
    if (travelDates.length === 0) return;
    const currentRange = travelDates[0];
  if (!currentRange) return;
  if (currentPeriodicity === "day") {
    const startDate = currentRange.startDate ? new Date(currentRange.startDate.getTime()) : new Date();
    const endDate = currentRange.endDate ? new Date(currentRange.endDate.getTime()) : undefined;
    if (!endDate || endDate < startDate) {
      setTravelDates([{ key: "selection", startDate, endDate: new Date(startDate.getTime()) }]);
    }
    return;
  }
    const startDate = currentRange.startDate ? new Date(currentRange.startDate.getTime()) : new Date();
    const endDate = computePeriodicEndDate(startDate, currentPeriodicity);
    const currentEnd = currentRange.endDate;
    if (!currentEnd || currentEnd.getTime() !== endDate.getTime()) {
      setTravelDates([{ key: "selection", startDate, endDate }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPeriodicity]);

  useEffect(() => {
    let isMounted = true;
    const fetchGeoData = async () => {
      try {
        const isNational = isNationalPlanType;
        const countryIdNumber = Number(countryId) || 1;
        const data: GeoSelect[] = isNational
          ? await geoService.getCountryCitiesSelect(countryIdNumber)
          : await geoService.getContinentsWithCountries();
        if (!isMounted) return;
        const mapped = mapAndSortGeoOptions(data, isNational ? "city" : undefined);
        setGeoOptions(mapped);
        const currentOrigin = originRef.current;
        if (
          currentOrigin &&
          !mapped.some((opt) =>
            String(opt.value) === String(currentOrigin.value) &&
            (!currentOrigin.type || currentOrigin.type === opt.type)
          )
        ) {
          setOrigin(null);
        }
        const currentDestination = destinationRef.current;
        if (
          currentDestination &&
          !mapped.some((opt) =>
            String(opt.value) === String(currentDestination.value) &&
            (!currentDestination.type || currentDestination.type === opt.type)
          )
        ) {
          setDestination(null);
        }
      } catch (err) {
        console.error("Error fetching opciones geográficas", err);
      }
    };
    fetchGeoData();
    return () => {
      isMounted = false;
    };
  }, [effectivePlanTypeId, countryId]);

  useEffect(() => {
    const currentScope: "national" | "international" = isNationalPlanType ? "national" : "international";
    if (previousGeoScopeRef.current && previousGeoScopeRef.current !== currentScope) {
      setOrigin(null);
      setDestination(null);
    }
    previousGeoScopeRef.current = currentScope;
  }, [isNationalPlanType]);

  useEffect(() => {
    const loadPlanTypes = async () => {
      try {
        const data = await insurancePlanTypeService.getInsurancePlanTypes();
        setPlanTypes(data);
      } catch (err) {
        console.error("Error fetching plan types", err);
      }
    };
    loadPlanTypes();
  }, []);

  useEffect(() => {
    if (availablePlanTypes.length === 0) {
      if (selectedPlanType !== "") {
        setSelectedPlanType("");
      }
      return;
    }

    const hasSelectedType = availablePlanTypes.some((pt) => String(pt.id) === String(selectedPlanType));
    if (!hasSelectedType) {
      setSelectedPlanType(String(availablePlanTypes[0].id));
    }
  }, [availablePlanTypes, selectedPlanType]);

  useEffect(() => {
    if (!isAgencyUser) return;
    if (!userAgencyId) return;
    if (selectedAgency !== userAgencyId) {
      setSelectedAgency(userAgencyId);
    }
  }, [isAgencyUser, userAgencyId, selectedAgency]);

  useEffect(() => {
    let active = true;
    const loadMyAgencyConfig = async () => {
      if (!isAgencyUser || !userAgencyId) {
        if (active) {
          setMyAgencyConfig(null);
        }
        return;
      }
      try {
        const agency = await agencyService.getMyAgency();
        if (!active) return;
        setMyAgencyConfig({
          allows_passengers: agency?.allows_passengers,
          allows_groups: agency?.allows_groups,
          is_domestic: agency?.is_domestic,
          is_international: agency?.is_international,
        });
      } catch (err) {
        console.error("Error fetching my agency config", err);
        if (active) {
          setMyAgencyConfig(null);
        }
      }
    };
    loadMyAgencyConfig();
    return () => {
      active = false;
    };
  }, [isAgencyUser, userAgencyId]);

  useEffect(() => {
    let active = true;
    const loadAgencies = async () => {
      if (isAgencyUser) {
        setAgencyOptions([]);
        setAgenciesLoading(false);
        return;
      }
      try {
        setAgenciesLoading(true);
        const data = await agencyService.getAgencies();
        if (!active) return;
        setAgencyOptions(data);
      } catch (err) {
        console.error("Error fetching agencies", err);
      } finally {
        if (active) {
          setAgenciesLoading(false);
        }
      }
    };
    loadAgencies();
    return () => {
      active = false;
    };
  }, [isAgencyUser]);

  // Restore state when returning from checkout via custom navigation state
  useEffect(() => {
    const restore = location?.state?.restore as
      | {
          form: {
            origin: SelectOption | null;
            destination: SelectOption | null;
            start_date: string;
            end_date: string;
            passengers: number;
            ages: number[];
            plan_type?: string | number;
            agency?: string | number;
            trip_mode?: TripMode;
            page?: string;
          };
          results: InsuranceSearchResult[] | null;
        }
      | undefined;

    if (restore?.form) {
      const restoredTripMode = restore.form.trip_mode ?? "travelers";
      setTripMode(restoredTripMode);
      setOrigin(restore.form.origin);
      setDestination(restore.form.destination);
      setTravelDates([
        {
          key: "selection",
          startDate: parseISODateLocal(restore.form.start_date),
          endDate: parseISODateLocal(restore.form.end_date),
        },
      ]);
      setPassengerCount(restore.form.passengers);
      if (restoredTripMode === "groups") {
        setAges([]);
      } else {
        setAges(restore.form.ages.map((a) => String(a)));
      }
      if (restore.form.plan_type != null) setSelectedPlanType(String(restore.form.plan_type));
      if (!isAgencyUser && restore.form.agency != null) setSelectedAgency(String(restore.form.agency));
      if (restore.results) setResults(restore.results);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAgencyUser]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const agencyParam = params.get("agency");
    if (!agencyParam) return;
    if (isAgencyUser) return;
    const hasRestore = Boolean(location?.state?.restore?.form?.agency);
    if (hasRestore) return;
    if (agencyParam !== selectedAgency) {
      setSelectedAgency(agencyParam);
    }
  }, [location.search, location?.state?.restore, selectedAgency, isAgencyUser]);

  useEffect(() => {
    if (!hasAvailableTripModes) return;

    const isCurrentModeAllowed = tripModeOptions.some((option) => option.value === tripMode);
    if (isCurrentModeAllowed) return;

    const fallbackMode = tripModeOptions[0].value;
    setTripMode(fallbackMode);

    if (fallbackMode === "groups") {
      setAges([]);
      return;
    }

    const normalizedCount = passengerCount > 10 ? 10 : passengerCount;
    if (normalizedCount !== passengerCount) {
      setPassengerCount(normalizedCount);
    }
    setAges(Array(normalizedCount).fill(""));
  }, [hasAvailableTripModes, tripModeOptions, tripMode, passengerCount]);

  const handleDateChange = (range: DayPickerRange | undefined, selectedDate?: Date) => {
    const currentRange = travelDates[0];
    const currentStart = currentRange?.startDate ? toLocalStartOfDay(currentRange.startDate) : null;
    const currentEnd = currentRange?.endDate ? toLocalStartOfDay(currentRange.endDate) : null;
    const hasCompletedMultiDayRange = Boolean(
      currentStart &&
      currentEnd &&
      currentEnd.getTime() > currentStart.getTime()
    );

    if (
      currentPeriodicity === "day" &&
      RESET_ON_SELECT &&
      selectedDate &&
      hasCompletedMultiDayRange
    ) {
      // Reset custom: al seleccionar una fecha con un rango ya completo, reinicia la selección desde ese día.
      const resetDate = toLocalStartOfDay(selectedDate);
      setDatePickerMonth(resetDate);
      setTravelDates([{ key: "selection", startDate: resetDate, endDate: resetDate }]);
      return;
    }

    const fallbackStart = currentRange?.startDate ? new Date(currentRange.startDate.getTime()) : new Date();
    const startDate = range?.from ? toLocalStartOfDay(range.from) : toLocalStartOfDay(fallbackStart);
    let endDate: Date;

    if (currentPeriodicity === "day") {
      const fallbackEnd = currentRange?.endDate ? new Date(currentRange.endDate.getTime()) : startDate;
      endDate = range?.to ? toLocalStartOfDay(range.to) : toLocalStartOfDay(fallbackEnd);
      if (endDate < startDate) endDate = new Date(startDate.getTime());
    } else {
      endDate = computePeriodicEndDate(startDate, currentPeriodicity);
    }

    setDatePickerMonth(startDate);
    setTravelDates([{ key: "selection", startDate, endDate }]);

    if (currentPeriodicity !== "day") {
      setTimeout(() => setShowDatePicker(false), 180);
      return;
    }

    if (range?.from && range?.to) {
      setTimeout(() => setShowDatePicker(false), 180);
    }
  };

  const handlePassengerChange = (count: number) => {
    if (count < 1) return;
    if (tripMode === "travelers" && count > 10) return;
    setPassengerCount(count);
    if (tripMode === "travelers") {
      setAges((prev) => {
        if (count === prev.length) return prev;
        if (count < prev.length) return prev.slice(0, count);
        return [...prev, ...Array(count - prev.length).fill("")];
      });
    }
  };

  const handleSearchClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    const newErrors: string[] = [];
    const newValidity = { origin: true, destination: true, dates: true, passengers: true, ages: true };

    if (!origin) { newErrors.push("Selecciona el origen."); newValidity.origin = false; }
    if (!destination) { newErrors.push("Selecciona el destino."); newValidity.destination = false; }
    if (!travelDates[0].startDate || !travelDates[0].endDate) { newErrors.push("Selecciona las fechas del viaje."); newValidity.dates = false; }
    if (passengerCount < 1) { newErrors.push("Debe haber al menos un pasajero."); newValidity.passengers = false; }
    if (!hasAvailableTripModes) {
      newErrors.push("La agencia seleccionada no tiene habilitado Plan para viajeros ni grupos.");
      newValidity.passengers = false;
    }
    if (hasPlanTypeScopeConflict) {
      newErrors.push("La agencia seleccionada no tiene tipos de plan habilitados para su alcance.");
    }
    if (tripMode === "travelers" && ages.some((age) => age === "" || Number(age) < 0)) {
      newErrors.push("Completa todas las edades correctamente.");
      newValidity.ages = false;
    }

    setErrorMessages(newErrors);
    setFieldValidity(newValidity);
    if (newErrors.length > 0) return;

    const formData: QuoteSearchParams = {
      origin: String(origin?.value ?? ""),
      destination: String(destination?.value ?? ""),
      start_date: format(travelDates[0].startDate, "yyyy-MM-dd"),
      end_date: format(travelDates[0].endDate, "yyyy-MM-dd"),
      days: calculateTotalDays(travelDates[0].startDate, travelDates[0].endDate, currentPeriodicity),
      passengers: passengerCount,
      ages: tripMode === "travelers" ? ages.map((a) => Number(a)) : [],
      trip_mode: tripMode,
      agency: effectiveSelectedAgency,
      ...(effectivePlanTypeId ? { plan_type: effectivePlanTypeId } : {}),
    };

    try {
      window.dispatchEvent(new CustomEvent('loader:start'));
      setLoading(true);
      setFetchError(null);
      const data = await insuranceService.search(formData);
      setResults(data);
      setLastSearchParams(formData);
      setSelectedPlanIds([]);
      setSelectionError(null);
    } catch (err) {
      console.error("Error buscando seguros", err);
      setFetchError("No se pudieron cargar los resultados.");
      setResults(null);
    } finally {
      setLoading(false);
      window.dispatchEvent(new CustomEvent('loader:end'));
    }
  };

  const handlePlanSelectionChange = (planId: number, checked: boolean) => {
    setSelectedPlanIds((prev) => {
      if (checked) {
        if (prev.includes(planId)) {
          return prev;
        }
        if (prev.length >= SELECTION_LIMIT) {
          setSelectionError(`Solo puedes seleccionar hasta ${SELECTION_LIMIT} planes.`);
          return prev;
        }
        setSelectionError(null);
        return [...prev, planId];
      }
      setSelectionError(null);
      return prev.filter((id) => id !== planId);
    });
  };

  const buildQuoteQueryString = (planIds: number[]) => {
    if (!lastSearchParams) return null;
    const params = new URLSearchParams();
    params.set("origin", String(lastSearchParams.origin));
    params.set("destination", String(lastSearchParams.destination));
    params.set("start_date", lastSearchParams.start_date);
    params.set("end_date", lastSearchParams.end_date);
    params.set("days", String(lastSearchParams.days));
    params.set("passengers", String(lastSearchParams.passengers));
    (lastSearchParams.ages ?? []).forEach((age) => {
      params.append("ages[]", String(age));
    });
    if (lastSearchParams.plan_type) {
      params.set("plan_type", String(lastSearchParams.plan_type));
    }
    if (lastSearchParams.agency && String(lastSearchParams.agency) !== "0") {
      params.set("agency", String(lastSearchParams.agency));
    }
    if (lastSearchParams.trip_mode) {
      params.set("trip_mode", lastSearchParams.trip_mode);
    }
    if (planIds.length > 0) {
      params.set("plans", planIds.join(","));
    }
    params.set("lang", selectedLanguage);
    return params.toString();
  };

  const quoteQueryString = useMemo(() => {
    return buildQuoteQueryString(selectedPlanIds);
  }, [lastSearchParams, selectedPlanIds, selectedLanguage]);

  const quoteInternalPath = quoteQueryString ? `/insurance/quotes/pdf?${quoteQueryString}` : null;
  const quoteShareUrl = quoteInternalPath ? `${window.location.origin}${quoteInternalPath}` : null;

  const parseNumericPrice = (value: string | number | null | undefined): number | null => {
    if (value == null) return null;
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/[^0-9.,-]/g, "");
      if (!cleaned) return null;
      const hasCommaDecimal = cleaned.includes(",") && cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".");
      const normalized = hasCommaDecimal
        ? cleaned.replace(/\./g, "").replace(",", ".")
        : cleaned;
      const num = Number(normalized);
      return Number.isNaN(num) ? null : num;
    }
    return null;
  };

  const formatCurrencyValue = (amount: number | null, currency: "USD" | "COP") => {
    if (amount == null) return selectedLanguage === "en" ? "N/A" : "N/D";
    const locale = currency === "COP" ? "es-CO" : "en-US";
    const options: Intl.NumberFormatOptions = {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "COP" ? 0 : 2,
    };
    return new Intl.NumberFormat(locale, options).format(amount);
  };

  const getPlanAmounts = (plan: InsuranceComparativeResponse["plans"][number]) => {
    const extendedPlan = plan as InsuranceComparativeResponse["plans"][number] & {
      price_cop_calc?: number | null;
      price_usd_calc?: number | null;
      exchange_rate_calc?: number | null;
    };
    const exchangeRate = extendedPlan.exchange_rate_calc;
    const copCandidates = [
      extendedPlan.price_cop_calc,
      extendedPlan.price_cop,
      extendedPlan.price_cop_original,
      exchangeRate && extendedPlan.price_usd_calc != null ? extendedPlan.price_usd_calc * exchangeRate : null,
    ];
    const usdCandidates = [
      extendedPlan.price_usd_calc,
      extendedPlan.price_usd,
      extendedPlan.price_usd_original,
      exchangeRate && extendedPlan.price_cop_calc != null ? extendedPlan.price_cop_calc / exchangeRate : null,
    ];
    const cop = copCandidates.map(parseNumericPrice).find((v) => v != null) ?? null;
    const usd = usdCandidates.map(parseNumericPrice).find((v) => v != null) ?? null;
    return { cop, usd };
  };

  const formatPlanPrice = (plan: InsuranceComparativeResponse["plans"][number]) => {
    const { cop, usd } = getPlanAmounts(plan);
    return (
      <div className="flex flex-col items-center leading-tight text-center">
        <span className="text-sm font-semibold text-[var(--color-secondary)]">
          COP: {formatCurrencyValue(cop, "COP")}
        </span>
        <span className="text-xs text-gray-600">
          USD: {formatCurrencyValue(usd, "USD")}
        </span>
      </div>
    );
  };

  const handleOpenQuotePdf = () => {
    if (!quoteInternalPath) return;
    window.open(quoteInternalPath, "_blank", "noopener,noreferrer");
  };

  const handleShareQuote = () => {
    if (!quoteShareUrl) return;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(quoteShareUrl)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const handleViewComparative = async () => {
    if (selectedPlanIds.length === 0) {
      setSelectionError("Debes seleccionar al menos un plan para comparar.");
      return;
    }
    try {
      setComparativeLoading(true);
      setComparativeError(null);
      const data = await insuranceService.getComparatives(selectedPlanIds, selectedLanguage);

      const enrichedPlans = data.plans.map((plan) => {
        const matchingResult = results?.find((r) => r.id === plan.id);
        const resultTotal = matchingResult?.values?.total_value;
        const exchangeRateRaw = (matchingResult?.values as any)?.exchangeRate ?? (matchingResult?.values as any)?.exchange_rate;
        const exchangeRate = Number(exchangeRateRaw ?? 0) || null;
        const currencyRaw =
          matchingResult?.currency
          ?? (matchingResult as any)?.additional_value?.currency
          ?? (matchingResult?.values as any)?.currency
          ?? null;
        const currency = String(currencyRaw ?? "").trim().toUpperCase();

        const parsedPlanUsd = parseNumericPrice(plan.price_usd ?? plan.price_usd_original);
        const parsedPlanCop = parseNumericPrice(plan.price_cop ?? plan.price_cop_original);

        const usdCandidates = [
          parsedPlanUsd,
          currency === "USD" ? parseNumericPrice(resultTotal as any) : null,
          currency === "COP" && exchangeRate ? (parseNumericPrice(resultTotal as any) ?? 0) / exchangeRate : null,
        ];
        const copCandidates = [
          parsedPlanCop,
          currency === "COP" ? parseNumericPrice(resultTotal as any) : null,
          currency !== "COP" && exchangeRate ? (parseNumericPrice(resultTotal as any) ?? 0) * exchangeRate : null,
          exchangeRate && parsedPlanUsd != null ? parsedPlanUsd * exchangeRate : null,
        ];

        const priceUsd = usdCandidates.find((v) => v != null) ?? null;
        const priceCop = copCandidates.find((v) => v != null) ?? null;

        return {
          ...plan,
          price_usd: plan.price_usd ?? priceUsd ?? plan.price_usd_original,
          price_cop: plan.price_cop ?? priceCop ?? plan.price_cop_original,
          price_usd_original: plan.price_usd_original ?? priceUsd,
          price_cop_original: plan.price_cop_original ?? priceCop,
          primary_value: plan.primary_value ?? matchingResult?.value_of ?? resultTotal ?? plan.primary_value,
          price_usd_calc: priceUsd,
          price_cop_calc: priceCop,
          exchange_rate_calc: exchangeRate,
        } as typeof plan & { price_usd_calc?: number | null; price_cop_calc?: number | null; exchange_rate_calc?: number | null };
      });

      const sortedPlans = [...enrichedPlans].sort((a, b) => {
        const amountsA = getPlanAmounts(a);
        const amountsB = getPlanAmounts(b);
        const priceA = amountsA.cop ?? amountsA.usd ?? Number.POSITIVE_INFINITY;
        const priceB = amountsB.cop ?? amountsB.usd ?? Number.POSITIVE_INFINITY;
        if (priceA !== priceB) return priceA - priceB;
        return a.name.localeCompare(b.name);
      });
      const planIndexMap = sortedPlans.map((plan) => data.plans.findIndex((p) => p.id === plan.id));
      const sortedCoverages = data.coverages.map((coverage) => ({
        ...coverage,
        values: planIndexMap.map((originalIdx) => (originalIdx >= 0 ? coverage.values[originalIdx] : null)),
      }));
      setComparativeData({ ...data, plans: sortedPlans, coverages: sortedCoverages });
      setShowComparativeModal(true);
    } catch (err) {
      console.error("Error cargando comparativo", err);
      setComparativeError("No se pudo cargar los beneficios.");
      setShowComparativeModal(true);
    } finally {
      setComparativeLoading(false);
    }
  };

  const handleCloseComparativeModal = () => {
    setShowComparativeModal(false);
    setComparativeError(null);
  };

  const handleBuy = (result: InsuranceSearchResult) => {
    const rawCurrency = String(
      result.currency
      ?? (result as any)?.additional_value?.currency
      ?? (result.values as any)?.currency
      ?? ""
    ).trim().toUpperCase();
    const currency = rawCurrency === "COP" ? "COP" : "USD";
    const totalValue = Number(result.values?.total_value ?? 0) || 0;
    const exchangeRateRaw = Number((result.values as any)?.exchangeRate ?? (result.values as any)?.exchange_rate ?? 0);
    const dynamicExchangeRate = Number.isFinite(exchangeRateRaw) && exchangeRateRaw > 0 ? exchangeRateRaw : null;
    const exchangeRate = currency === "COP" ? 1 : dynamicExchangeRate;
    const totalUSD = currency === "USD" ? totalValue : undefined;
    const totalCOP = currency === "COP"
      ? Math.round(totalValue)
      : (exchangeRate ? Math.round(totalValue * exchangeRate) : null);
    const commissionRaw = Number((result.values as any)?.commission ?? 0);
    const commission = Number.isFinite(commissionRaw) ? commissionRaw : 0;
    const commissionCOP = currency === "COP"
      ? Math.round(commission)
      : (exchangeRate ? Math.round(commission * exchangeRate) : null);
    const commissionPercentRaw = Number((result.values as any)?.commission_percent ?? 0);
    const commissionPercent = Number.isFinite(commissionPercentRaw) ? commissionPercentRaw : 0;
    const commissionType = String((result.values as any)?.commission_type ?? "not_included").toLowerCase();
    const agencyCreditLimitRaw = Number(result.agency_credit_limit);
    const agencyCreditAvailableRaw = Number(result.agency_credit_available);
    const agencyCreditLimit = Number.isFinite(agencyCreditLimitRaw) ? agencyCreditLimitRaw : null;
    const agencyCreditAvailable = Number.isFinite(agencyCreditAvailableRaw)
      ? agencyCreditAvailableRaw
      : agencyCreditLimit;

    const resultPlanTypeId = (result as any)?.plan_type_id ?? (result as any)?.plan_type ?? null;
    const formPlanTypeId = effectivePlanTypeId != null ? effectivePlanTypeId : null;
    const planTypeId = formPlanTypeId ?? resultPlanTypeId;
    const planTypeName =
      (planTypeId != null
        ? planTypes.find((pt) => String(pt.id) === String(planTypeId))?.name
        : undefined)
      ?? (result as any)?.plan_type_name
      ?? currentPlanTypeName;

    const agencyOption = agencyOptions.find((agency) => String(agency.id) === effectiveSelectedAgency);
    const agencyName = effectiveSelectedAgency === "0"
      ? "Sin agencia"
      : agencyOption?.name ?? user?.agency?.name ?? effectiveSelectedAgency;

    const summary = {
      originLabel: origin?.label,
      destinationLabel: destination?.label,
      startDate: travelDates[0]?.startDate ? format(travelDates[0].startDate, "yyyy-MM-dd") : undefined,
      endDate: travelDates[0]?.endDate ? format(travelDates[0].endDate, "yyyy-MM-dd") : undefined,
      passengers: passengerCount,
      ages: tripMode === "travelers" ? ages.map((a) => Number(a)).filter((n) => !Number.isNaN(n)) : [],
      tripMode,
      agency: effectiveSelectedAgency,
      agencyName,
      page,
      product: result.company?.name || result.name,
      plan: result.name,
      planName: result.name,
      planId: result.id,
      planTypeId: planTypeId,
      planTypeName: planTypeName,
      currency,
      totalUSD,
      exchangeRate,
      totalCOP,
      commissionValue: commission,
      commissionCOP,
      commissionPercent,
      commissionType,
      agencyCreditLimit,
      agencyCreditAvailable,
    };

    const restore = {
      form: {
        origin,
        destination,
        start_date: format(travelDates[0].startDate, "yyyy-MM-dd"),
        end_date: format(travelDates[0].endDate, "yyyy-MM-dd"),
        passengers: passengerCount,
        ages: tripMode === "travelers" ? ages.map((a) => Number(a)).filter((n) => !Number.isNaN(n)) : [],
        plan_type: effectivePlanTypeId || undefined,
        agency: effectiveSelectedAgency,
        trip_mode: tripMode,
        page,
      },
      results,
    };

    window.dispatchEvent(new CustomEvent('loader:start'));
    navigate("/insurance/checkout", { state: { summary, restore } });
    window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent('loader:end'));
    }, 400);
  };

  const totalDays = calculateTotalDays(travelDates[0].startDate, travelDates[0].endDate, currentPeriodicity);
  const selectionCount = selectedPlanIds.length;
  const selectionLimitReached = selectionCount >= SELECTION_LIMIT;
  const selectedDayPickerRange = useMemo<DayPickerRange | undefined>(() => {
    const current = travelDates[0];
    if (!current?.startDate) return undefined;
    return {
      from: current.startDate,
      to: current.endDate ?? current.startDate,
    };
  }, [travelDates]);
  const minTravelDate = useMemo(() => toLocalStartOfDay(new Date()), []);

  return (
    <div className="container mx-auto ">
      <div className="flex flex-col gap-6 items-start">
        <div className="w-full space-y-6">
          <form id="quote-form" className="space-y-6 bg-base-100 rounded-xl shadow p-6">
        <div className="rounded-2xl bg-[var(--color-secondary)] text-[var(--color-primary-content)] text-center py-4">
          <div className="text-lg font-semibold">Emision {currentPlanTypeName}</div>
          <div className="mx-auto mt-2 h-1 w-12 rounded bg-[var(--color-primary)]" />
        </div>
        <div className="p-6">
          {errorMessages.length > 0 && (
            <div className={`alert ${errorMessages[0].includes("válido") ? "alert-success" : "alert-error"} flex flex-col gap-1`}>
              {errorMessages.map((err, i) => (
                <span key={i} className="text-sm">• {err}</span>
              ))}
            </div>
          )}

          <div className="flex flex-wrap justify-start gap-4 mb-4">
            <div className="w-full sm:w-auto">
              <label className="block mb-1 text-sm font-semibold text-gray-700" htmlFor="plan-type-select">Tipo de plan</label>
              <select
                id="plan-type-select"
                className="select select-bordered w-full min-w-[220px]"
                value={selectedPlanType}
                onChange={(e) => handlePlanTypeChange(e.target.value)}
                disabled={availablePlanTypes.length === 0}
              >
                {availablePlanTypes.length > 0 ? (
                  availablePlanTypes.map((pt) => (
                    <option key={pt.id} value={String(pt.id)}>{pt.name}</option>
                  ))
                ) : (
                  <option value="">Sin tipos de plan habilitados</option>
                )}
              </select>
              {hasPlanTypeScopeConflict && (
                <p className="mt-1 text-xs text-error">
                  La agencia seleccionada no tiene marcado nacional ni internacional.
                </p>
              )}
            </div>
            {!isAgencyUser && (
              <div className="w-full sm:w-auto">
                <label className="block mb-1 text-sm font-semibold text-gray-700" htmlFor="agency-select">Agencia</label>
                <select
                  id="agency-select"
                  className="select select-bordered w-full min-w-[220px]"
                  value={selectedAgency}
                  onChange={(e) => setSelectedAgency(e.target.value)}
                  disabled={agenciesLoading}
                >
                  <option value="0">Sin agencia</option>
                  {agencyOptions.map((agency) => (
                    <option key={agency.id} value={String(agency.id)}>
                      {agency.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            <div>
              <label className="block mb-1 text-sm font-semibold text-gray-700">Origen</label>
              <div className={`rounded-md ${!fieldValidity.origin ? "ring-2 ring-error" : ""}`}>
                <Select
                  options={geoOptions}
                  value={origin}
                  onChange={(val: SingleValue<SelectOption>) => setOrigin(val)}
                  placeholder="Selecciona origen"
                  formatOptionLabel={formatGeoOptionLabel}
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-sm font-semibold text-gray-700">Destino</label>
              <div className={`rounded-md ${!fieldValidity.destination ? "ring-2 ring-error" : ""}`}>
                <Select
                  options={geoOptions}
                  value={destination}
                  onChange={(val: SingleValue<SelectOption>) => setDestination(val)}
                  placeholder="Selecciona destino"
                  formatOptionLabel={formatGeoOptionLabel}
                />
              </div>
            </div>

            <div className="lg:col-span-1">
              <label className="block mb-1 text-sm font-semibold text-gray-700">Fechas de viaje</label>
              <button
                type="button"
                onClick={() => {
                  const currentStart = travelDates[0]?.startDate ? toLocalStartOfDay(travelDates[0].startDate) : toLocalStartOfDay(new Date());
                  setDatePickerMonth(currentStart);
                  setShowDatePicker(true);
                }}
                className={`w-full flex justify-between items-center input input-bordered text-left ${!fieldValidity.dates ? "input-error" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <FaCalendar className="text-primary text-lg" />
                  <span>
                    {`${format(travelDates[0].startDate, "dd/MM/yyyy", { locale: es })} - ${format(travelDates[0].endDate, "dd/MM/yyyy", { locale: es })}`}
                  </span>
                </div>
                <span className="badge badge-outline">{totalDays} dias</span>
              </button>
            </div>

          </div>

          {showDatePicker && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDatePicker(false)}>
              <div className="quote-date-popup relative bg-base-100 rounded-2xl shadow-2xl p-3 md:p-4 w-fit max-w-[760px] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setShowDatePicker(false)} className="absolute top-2 right-2 text-gray-500 hover:text-primary">
                  <FaTimes size={18} />
                </button>
                <DayPicker
                  mode="range"
                  selected={selectedDayPickerRange}
                  onSelect={(range, day) => handleDateChange(range, day)}
                  month={datePickerMonth}
                  onMonthChange={setDatePickerMonth}
                  locale={es}
                  numberOfMonths={isMobile ? 1 : 2}
                  weekStartsOn={1}
                  showOutsideDays
                  disabled={{ before: minTravelDate }}
                  className={`quote-day-picker rounded-xl ${isMobile ? "quote-day-picker--mobile" : "quote-day-picker--desktop"}`}
                />
              </div>
            </div>
          )}

          <div className={`mt-5 rounded-lg ${!fieldValidity.passengers || (tripMode === "travelers" && !fieldValidity.ages) ? "border border-error " : "bg-transparent"}`}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
              <div className="lg:col-span-2">
                <label className="block mb-1 text-sm font-semibold text-gray-700" htmlFor="trip-mode-select">Plan para</label>
                <select
                  id="trip-mode-select"
                  className="select select-bordered w-full"
                  value={tripMode}
                  disabled={!hasAvailableTripModes}
                  onChange={(e) => {
                    const mode = e.target.value as TripMode;
                    setTripMode(mode);
                    if (mode === "groups") {
                      setAges([]);
                    } else {
                      const normalizedCount = passengerCount > 10 ? 10 : passengerCount;
                      if (normalizedCount !== passengerCount) {
                        setPassengerCount(normalizedCount);
                      }
                      setAges(Array(normalizedCount).fill(""));
                    }
                  }}
                >
                  {hasAvailableTripModes ? (
                    tripModeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))
                  ) : (
                    <option value={tripMode}>No habilitado para esta agencia</option>
                  )}
                </select>
                {!hasAvailableTripModes && (
                  <p className="mt-1 text-xs text-error">
                    Esta agencia no tiene habilitado Viajeros ni Grupos.
                  </p>
                )}
              </div>

              <div className={tripMode === "travelers" ? "lg:col-span-2" : "lg:col-span-10"}>
                <label className="block mb-1 text-sm font-semibold text-gray-700">Numero de pasajeros</label>
                <div className="flex items-center gap-3">
                  <button type="button" className="btn btn-sm btn-circle btn-primary" onClick={() => handlePassengerChange(passengerCount - 1)} disabled={!hasAvailableTripModes}>
                    <FaMinus />
                  </button>
                  {tripMode === "groups" ? (
                    <input
                      type="number"
                      min={1}
                      className="input input-bordered w-20 text-center"
                      value={passengerCount}
                      disabled={!hasAvailableTripModes}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        if (!Number.isNaN(next) && next >= 1) {
                          setPassengerCount(next);
                        }
                      }}
                    />
                  ) : (
                    <span className="text-lg font-semibold w-12 text-center">{passengerCount}</span>
                  )}
                  <button type="button" className="btn btn-sm btn-circle btn-primary" onClick={() => handlePassengerChange(passengerCount + 1)} disabled={!hasAvailableTripModes}>
                    <FaPlus />
                  </button>
                </div>
              </div>

              {tripMode === "travelers" && (
                <div className="lg:col-span-8">
                  <label className="flex items-center gap-2 mb-1 text-sm font-semibold text-gray-700">
                    Edades
                    <button
                      type="button"
                      aria-label="Calculadora de edad"
                      onClick={() => setShowAgeCalc(true)}
                      className="btn btn-outline btn-xs flex items-center gap-1"
                    >
                      <FaCalculator className="text-primary" />
                      <span>Calcular</span>
                    </button>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9 gap-2 w-full">
                    {ages.map((age, index) => (
                      <input
                        key={index}
                        type="number"
                        min="0"
                        className={`input input-bordered w-full text-center text-sm ${!fieldValidity.ages && (age === "" || Number(age) < 0) ? "input-error" : ""}`}
                        placeholder={`Edad ${index + 1}`}
                        value={age}
                        onChange={(e) => {
                          const newAges = [...ages];
                          newAges[index] = e.target.value;
                          setAges(newAges);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {showAgeCalc && (
            <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50 p-4" onClick={() => setShowAgeCalc(false)}>
              <div className="relative bg-base-100/95 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => setShowAgeCalc(false)} className="absolute top-2 right-2 text-gray-500 hover:text-primary">
                  <FaTimes size={18} />
                </button>
                <h3 className="text-lg font-semibold mb-4 text-center">Calculadora de edad</h3>
                <label className="block mb-1 text-sm font-semibold text-gray-700">Fecha de nacimiento</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="input input-bordered w-full mb-3"
                />
                <button
                  type="button"
                  className="btn btn-outline btn-sm w-full mb-4"
                  onClick={() => setDob("")}
                >
                  Limpiar fecha
                </button>
                <div className="text-center">
                  <div className="text-sm text-gray-500 mb-1">Edad actual</div>
                  <div className="text-3xl font-bold">{calcAge(dob) ?? "-"} {calcAge(dob) === 1 ? 'año' : 'años'}</div>
                </div>
              </div>
            </div>
          )}

          
          <div className="flex lg:justify-start mt-6">
            <button
              type="button"
              onClick={handleSearchClick}
              className="btn bg-[var(--color-primary)] hover:opacity-90 border-none text-[var(--color-primary-content)] w-full lg:w-auto px-8 disabled:opacity-60"
              disabled={!hasAvailableTripModes || hasPlanTypeScopeConflict}
            >
              Cotizar
            </button>
          </div>
        </div>
        <style>{`
          .quote-date-popup {
            width: fit-content;
            max-width: min(760px, 100%);
            padding-top: 2.75rem;
          }
          .quote-day-picker {
            --rdp-accent-color: var(--color-primary);
            --rdp-range_middle-background-color: transparent;
            --rdp-range_start-background: transparent;
            --rdp-range_end-background: transparent;
            width: fit-content;
            max-width: 100%;
          }
          .quote-day-picker .rdp-months {
            width: fit-content;
            max-width: 100%;
            display: grid;
            grid-template-columns: repeat(2, max-content);
            gap: 1rem;
          }
          .quote-day-picker--mobile {
            width: 100%;
          }
          .quote-day-picker--mobile .rdp-months {
            width: 100%;
            grid-template-columns: 1fr;
            gap: 0.5rem;
          }
          .quote-day-picker .rdp-month {
            width: max-content;
            min-width: 0;
            padding: 0.25rem;
            background: transparent;
            border: none;
            box-shadow: none;
          }
          .quote-day-picker .rdp-month_grid {
            width: auto;
            border-collapse: separate;
            border-spacing: 0.18rem;
          }
          .quote-day-picker--mobile .rdp-month {
            width: 100%;
          }
          .quote-day-picker--mobile .rdp-month_grid {
            width: 100%;
            table-layout: fixed;
          }
          .quote-day-picker .rdp-caption_label {
            color: var(--color-secondary);
            font-weight: 700;
          }
          .quote-day-picker .rdp-weekday {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            color: color-mix(in srgb, var(--color-secondary) 75%, #000 25%);
            font-weight: 700;
          }
          .quote-day-picker .rdp-day {
            padding: 0.15rem;
          }
          .quote-day-picker .rdp-day_button {
            width: 2.2rem;
            height: 2.2rem;
            margin-inline: auto;
            border-radius: 9999px;
            font-size: 0.88rem;
          }
          .quote-day-picker .rdp-day_button:hover:not([disabled]) {
            background: color-mix(in srgb, var(--color-primary) 14%, transparent);
            color: var(--color-secondary);
          }
          .quote-day-picker .rdp-selected .rdp-day_button,
          .quote-day-picker .rdp-range_start .rdp-day_button,
          .quote-day-picker .rdp-range_end .rdp-day_button {
            background: var(--color-primary);
            color: var(--color-primary-content);
          }
          .quote-day-picker .rdp-range_start,
          .quote-day-picker .rdp-range_middle,
          .quote-day-picker .rdp-range_end {
            background: transparent !important;
          }
          .quote-day-picker .rdp-range_middle .rdp-day_button {
            background: color-mix(in srgb, var(--color-primary) 18%, transparent);
            color: var(--color-secondary);
          }
          .quote-day-picker .rdp-nav_button {
            border: 1px solid color-mix(in srgb, var(--color-secondary) 20%, transparent);
            border-radius: 9999px;
          }
          .quote-day-picker .rdp-nav_button:hover {
            background: color-mix(in srgb, var(--color-primary) 12%, transparent);
          }
          @media (max-width: 900px) {
            .quote-date-popup {
              width: 100%;
              padding-top: 3rem;
            }
            .quote-day-picker .rdp-months {
              grid-template-columns: 1fr;
              gap: 0.5rem;
            }
          }
        `}</style>
          </form>

          <div className="mt-6">
            <div className="bg-base-100 rounded-xl shadow p-4 flex flex-wrap items-start gap-4 justify-between w-full">
              <div className="flex flex-wrap items-center gap-4">
                <div className="text-sm text-gray-600">
                  Planes seleccionados: {selectionCount}/{SELECTION_LIMIT}
                </div>
                {selectionError && (
                  <div className="text-sm text-error">{selectionError}</div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Lenguaje:</span>
                  <div className="join">
                    {(["es", "en"] as LanguageOption[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        className={`btn btn-sm join-item ${
                          selectedLanguage === lang ? "btn-primary text-white" : "btn-outline"
                        }`}
                        onClick={() => setSelectedLanguage(lang)}
                      >
                        {lang.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleOpenQuotePdf}
                    disabled={!quoteInternalPath}
                  >
                    Ver Cotización (PDF)
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleShareQuote}
                    disabled={!quoteInternalPath}
                  >
                    Enviar por WhatsApp
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleViewComparative}
                    disabled={!results || results.length === 0 || comparativeLoading}
                  >
                    Ver Beneficios
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-600">Vista:</span>
                <div className="join">
                  <button
                    type="button"
                    className={`btn btn-sm join-item ${resultsView === "grid" ? "btn-primary text-white" : "btn-outline"}`}
                    onClick={() => setResultsView("grid")}
                    aria-pressed={resultsView === "grid"}
                    title="Cuadrícula"
                  >
                    <FaThLarge />
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm join-item ${resultsView === "list" ? "btn-primary text-white" : "btn-outline"}`}
                    onClick={() => setResultsView("list")}
                    aria-pressed={resultsView === "list"}
                    title="Lista"
                  >
                    <FaList />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            {loading && (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg text-primary" />
              </div>
            )}
            {fetchError && <div className="alert alert-error">{fetchError}</div>}
            {results && results.length > 0 && (
              <div className={`grid grid-cols-1 ${resultsView === "grid" ? "lg:grid-cols-3" : ""} gap-4`}>
                {results.map((r) => {
                  const isSelected = selectedPlanIds.includes(r.id);
                  return (
                    <ResultCard
                      key={`${r.id}-${r.code}`}
                      result={r}
                      onBuy={handleBuy}
                      view={resultsView}
                      language={selectedLanguage}
                      selectable
                      selected={isSelected}
                      selectionDisabled={selectionLimitReached && !isSelected}
                      onSelectChange={(checked) => handlePlanSelectionChange(r.id, checked)}
                    />
                  );
                })}
              </div>
            )}
            {results && results.length === 0 && (
              <div className="text-center text-sm text-gray-500 py-6">No se encontraron resultados.</div>
            )}
          </div>

        </div>

      </div>
      <div className="mt-6">
        {showComparativeModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={handleCloseComparativeModal}>
            <div
              className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <div>
                  <h3 className="text-lg font-semibold">{selectedLanguage === "en" ? "Benefits" : "Beneficios"}</h3>
                  <p className="text-sm text-gray-500">
                    {selectedLanguage === "en"
                      ? "Selected plans coverage overview"
                      : "Resumen de coberturas de los planes seleccionados"}
                  </p>
                </div>
                <button type="button" className="btn btn-sm btn-circle btn-ghost" onClick={handleCloseComparativeModal}>
                  ✕
                </button>
              </div>
              <div className="p-6 overflow-auto">
                {comparativeLoading && (
                  <div className="flex justify-center py-10">
                    <span className="loading loading-spinner loading-lg text-primary" />
                  </div>
                )}
                {!comparativeLoading && comparativeError && (
                  <div className="alert alert-error">
                    <span>{comparativeError}</span>
                  </div>
                )}
                {!comparativeLoading && !comparativeError && comparativeData && (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra">
                      <thead>
                        <tr>
                          <th className="bg-base-200 text-left">
                            {selectedLanguage === "en" ? "Coverage" : "Cobertura"}
                          </th>
                          {comparativeData.plans.map((plan) => (
                            <th key={plan.id} className="bg-base-200 align-top text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-sm font-semibold">{plan.name}</span>
                                {formatPlanPrice(plan)}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {comparativeData.coverages.map((coverage, idx) => (
                          <tr key={`${coverage.label}-${idx}`}>
                            <td className="font-medium text-left">{coverage.label}</td>
                            {coverage.values.map((value, valueIdx) => (
                              <td key={`${coverage.label}-${valueIdx}`} className="text-sm text-center">
                                {value ?? "-"}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteForm2;
