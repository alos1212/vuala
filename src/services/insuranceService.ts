import api from "../lib/axios";
import type { InsuranceSearchParams, InsuranceSearchResult } from "../types/insuranceSearch";
import type { InsuranceComparativeResponse } from "../types/insuranceComparative";

const normalizeIncludedValue = (
  value: string | number | null | undefined,
  lang: "es" | "en"
): string | number | undefined => {
  if (value == null) return undefined;
  if (typeof value !== "string") return value;
  const normalized = value.trim().toLowerCase();
  if (normalized === "yes") return lang === "es" ? "incluido" : "included";
  if (normalized === "no") return lang === "es" ? "no incluido" : "not included";
  return value;
};

const buildPlanDetailFileNameFromName = (
  planNameRaw: string,
  extension: "pdf" | "jpg"
): string => {
  const planName = String(planNameRaw ?? "").trim();
  if (!planName) return `detalle-plan.${extension}`;

  const normalized = planName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) return `detalle-plan.${extension}`;
  return `detalle-plan-${normalized}.${extension}`;
};

const buildPlanDetailFileName = (plan: InsuranceSearchResult): string =>
  buildPlanDetailFileNameFromName(String(plan?.name ?? ""), "pdf");

const buildPlanDetailImageFileName = (planName: string): string =>
  buildPlanDetailFileNameFromName(planName, "jpg");

export const insuranceService = {
  search: async (
    params: InsuranceSearchParams
  ): Promise<InsuranceSearchResult[]> => {
    const { data } = await api.post<InsuranceSearchResult[]>(
      "/insurance/search",
      params
    );
    return data.map((result) => ({
      ...result,
      comparatives: (result.comparatives ?? []).map((comparative) => {
        const normalizedValue1 = normalizeIncludedValue(comparative.value1, "es");
        return {
          ...comparative,
          value1: typeof normalizedValue1 === "number" ? String(normalizedValue1) : normalizedValue1,
          value2: normalizeIncludedValue(comparative.value2, "en"),
        };
      }),
    }));
  },
  getComparatives: async (
    planIds: number[],
    language: string
  ): Promise<InsuranceComparativeResponse> => {
    const params = new URLSearchParams();
    params.set("plans", planIds.join(","));
    params.set("lang", language);
    const { data } = await api.get<InsuranceComparativeResponse>(
      `/insurance/plans/comparatives?${params.toString()}`
    );
    const lang = language === "en" ? "en" : "es";
    return {
      ...data,
      coverages: Array.isArray(data.coverages)
        ? data.coverages.map((coverage) => ({
            ...coverage,
            values: coverage.values.map((value) => {
              const normalized = normalizeIncludedValue(value, lang);
              return normalized ?? null;
            }),
          }))
        : data.coverages,
    };
  },
  downloadPlanDetailPdf: async (
    plan: InsuranceSearchResult,
    language: "es" | "en" = "es"
  ): Promise<{ blob: Blob; filename: string }> => {
    const { data, headers } = await api.post<Blob>(
      "/insurance/plans/detail-pdf",
      {
        plan,
        lang: language,
      },
      {
        responseType: "blob",
        timeout: 30000,
      }
    );

    const headerFileName = String(headers["x-file-name"] ?? "");
    const disposition = String(headers["content-disposition"] ?? "");
    const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const basicMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
    const decodedUtfName = (() => {
      if (!utfMatch?.[1]) return "";
      try {
        return decodeURIComponent(utfMatch[1]);
      } catch {
        return utfMatch[1];
      }
    })();
    const resolvedName = headerFileName
      || decodedUtfName
      || basicMatch?.[1];
    const fallbackName = buildPlanDetailFileName(plan);
    const filename = resolvedName && resolvedName.trim() ? resolvedName.trim() : fallbackName;

    return { blob: data, filename };
  },
  downloadPlanDetailImage: async (
    planId: number,
    planName: string = "",
    language: "es" | "en" = "es"
  ): Promise<{ blob: Blob; filename: string }> => {
    const { data, headers } = await api.post<Blob>(
      "/insurance/plans/detail-image",
      {
        plan_id: planId,
        lang: language,
      },
      {
        responseType: "blob",
        timeout: 30000,
      }
    );

    const headerFileName = String(headers["x-file-name"] ?? "");
    const disposition = String(headers["content-disposition"] ?? "");
    const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
    const basicMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
    const decodedUtfName = (() => {
      if (!utfMatch?.[1]) return "";
      try {
        return decodeURIComponent(utfMatch[1]);
      } catch {
        return utfMatch[1];
      }
    })();
    const resolvedName = headerFileName
      || decodedUtfName
      || basicMatch?.[1];
    const fallbackName = buildPlanDetailImageFileName(planName);
    const filename = resolvedName && resolvedName.trim() ? resolvedName.trim() : fallbackName;

    return { blob: data, filename };
  },
  resolveLogoDataUri: async (logo: string): Promise<string | null> => {
    const source = String(logo ?? "").trim();
    if (!source) return null;

    try {
      const { data } = await api.get<{ status?: string; data_uri?: string | null }>(
        "/insurance/logo-data-uri",
        {
          params: { logo: source },
          timeout: 12000,
        }
      );
      const dataUri = typeof data?.data_uri === "string" ? data.data_uri.trim() : "";
      return dataUri || null;
    } catch {
      return null;
    }
  },
};
