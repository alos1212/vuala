import React, { useMemo, useState } from "react";
import { FaDownload, FaImage } from "react-icons/fa";
import { insuranceService } from "../../services/insuranceService";
import type { InsuranceSearchResult } from "../../types/insuranceSearch";
import { resolveStorageUrl } from "../../utils/authHelpers";

interface Props {
  result: InsuranceSearchResult;
  onBuy?: (result: InsuranceSearchResult) => void;
  selectable?: boolean;
  selected?: boolean;
  selectionDisabled?: boolean;
  onSelectChange?: (checked: boolean) => void;
  view?: "grid" | "list";
  language?: "es" | "en";
}

const currencyUSD = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n || 0);

const currencyCOP = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n || 0);

const formatCoverageValue = (value: unknown): string => {
  if (value == null) return "-";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "-";
  const text = String(value).trim();
  return text || "-";
};

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const truncate = (value: string, max: number): string =>
  value.length <= max ? value : `${value.slice(0, Math.max(0, max - 1))}…`;

const toFileSlug = (value: string): string => {
  const normalized = String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "plan";
};

const PLAN_IMAGE_WIDTH = 1280;

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        reject(new Error("No se pudo convertir el logo a data URL."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("No se pudo leer el logo."));
    reader.readAsDataURL(blob);
  });

const buildLogoCandidates = (rawLogoUrl?: string | null): string[] => {
  const raw = String(rawLogoUrl ?? "").trim();
  if (!raw) return [];

  const candidates: string[] = [];
  const pushCandidate = (value?: string | null) => {
    const candidate = String(value ?? "").trim();
    if (!candidate) return;
    if (!candidates.includes(candidate)) {
      candidates.push(candidate);
    }
  };

  pushCandidate(raw);
  pushCandidate(resolveStorageUrl(raw));

  try {
    const parsed = new URL(raw);
    const pathname = parsed.pathname.replace(/\/{2,}/g, "/");
    if (pathname.startsWith("/storage/")) {
      const apiBaseRaw = String(import.meta.env.VITE_API_BASE_URL ?? "").trim();
      if (apiBaseRaw) {
        const apiBase = new URL(apiBaseRaw);
        pushCandidate(`${apiBase.origin}${pathname}${parsed.search || ""}${parsed.hash || ""}`);
      }
    }
  } catch {
    // URL relativa; resolveStorageUrl ya agrega candidato alterno.
  }

  return candidates;
};

const resolveLogoForImage = async (rawLogoUrl?: string | null): Promise<string | null> => {
  const candidates = buildLogoCandidates(rawLogoUrl);
  if (!candidates.length) return null;

  for (const candidate of candidates) {
    if (candidate.startsWith("data:")) return candidate;

    try {
      const response = await fetch(candidate, {
        mode: "cors",
        credentials: "include",
        cache: "force-cache",
      });
      if (!response.ok) continue;

      const logoBlob = await response.blob();
      if (!logoBlob.size) continue;

      return await blobToDataUrl(logoBlob);
    } catch {
      // Si falla por CORS/red, intenta con el siguiente candidato.
    }
  }

  for (const candidate of candidates) {
    const dataUri = await insuranceService.resolveLogoDataUri(candidate);
    if (dataUri) return dataUri;
  }

  // Evita URLs rotas en el fallback SVG->JPG del navegador.
  return null;
};

const buildPlanDetailImageSvg = (params: {
  title: string;
  logoUrl?: string | null;
  coverages: Array<{ label: string; value: string }>;
  language: "es" | "en";
  colorStart?: string;
  colorEnd?: string;
}) => {
  const width = PLAN_IMAGE_WIDTH;
  const rowHeight = 36;
  const listStartY = 312;
  const visibleCoverages = params.coverages;
  const height = Math.max(760, listStartY + visibleCoverages.length * rowHeight + 120);
  const coveragesTitle = params.language === "en" ? "Coverages" : "Coberturas";
  const colorStart = params.colorStart || "#113a6d";
  const colorEnd = params.colorEnd || "#0d9488";
  const logoBlock = params.logoUrl
    ? `
      <rect x="${width - 320}" y="74" width="228" height="104" rx="18" fill="rgba(255,255,255,0.18)" />
      <image href="${escapeXml(params.logoUrl)}" xlink:href="${escapeXml(params.logoUrl)}" x="${width - 304}" y="86" width="196" height="80" preserveAspectRatio="xMidYMid meet" />
    `
    : `
      <rect x="${width - 320}" y="74" width="228" height="104" rx="18" fill="rgba(255,255,255,0.18)" />
      <text x="${width - 206}" y="136" text-anchor="middle" fill="#ffffff" font-size="22" font-weight="700">LOGO</text>
    `;

  const rows = visibleCoverages
    .map((coverage, index) => {
      const y = listStartY + index * rowHeight;
      const fill = index % 2 === 0 ? "#f8fafc" : "#eef2ff";
      return `
        <rect x="78" y="${y - 21}" width="${width - 156}" height="30" rx="10" fill="${fill}" />
        <text x="98" y="${y}" fill="#10213d" font-size="16" font-weight="600">${escapeXml(truncate(coverage.label, 80))}</text>
        <text x="${width - 98}" y="${y}" fill="#0f172a" font-size="16" font-weight="700" text-anchor="end">${escapeXml(truncate(coverage.value, 36))}</text>
      `;
    })
    .join("");

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${escapeXml(colorStart)}" />
          <stop offset="100%" stop-color="${escapeXml(colorEnd)}" />
        </linearGradient>
      </defs>
      <style>
        text { font-family: "Poppins", "Montserrat", "Segoe UI", Arial, sans-serif; }
      </style>
      <rect width="${width}" height="${height}" fill="#f1f5f9" />
      <rect x="40" y="36" width="${width - 80}" height="${height - 72}" rx="28" fill="#ffffff" />
      <rect x="40" y="36" width="${width - 80}" height="220" rx="28" fill="url(#headerGrad)" />
      <circle cx="${width - 120}" cy="100" r="72" fill="rgba(255,255,255,0.12)" />
      <circle cx="${width - 220}" cy="50" r="48" fill="rgba(255,255,255,0.08)" />

      <text x="84" y="92" fill="#dbeafe" font-size="18" font-weight="700" letter-spacing="2">${params.language === "en" ? "PLAN DETAIL" : "DETALLE DEL PLAN"}</text>
      <text x="84" y="132" fill="#ffffff" font-size="44" font-weight="800">${escapeXml(truncate(params.title || "Plan", 42))}</text>
      ${logoBlock}

      <text x="84" y="206" fill="#ffffff" font-size="26" font-weight="800">${escapeXml(coveragesTitle)}</text>
      ${rows}
    </svg>
  `;
  return { svg, width, height };
};

const renderSvgToJpegBlob = (svg: string, width: number, height: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) {
          URL.revokeObjectURL(svgUrl);
          reject(new Error("No se pudo crear el contexto de imagen."));
          return;
        }
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(svgUrl);
            if (!blob) {
              reject(new Error("No se pudo exportar la imagen en JPG."));
              return;
            }
            resolve(blob);
          },
          "image/jpeg",
          0.92,
        );
      } catch (error) {
        URL.revokeObjectURL(svgUrl);
        reject(error instanceof Error ? error : new Error("No se pudo renderizar la imagen del plan."));
      }
    };
    image.onerror = () => {
      URL.revokeObjectURL(svgUrl);
      reject(new Error("No se pudo renderizar la imagen del plan."));
    };
    image.src = svgUrl;
  });

const ResultCard: React.FC<Props> = ({
  result,
  onBuy,
  selectable = false,
  selected = false,
  selectionDisabled = false,
  onSelectChange,
  view = "grid",
  language = "es",
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [renderingImage, setRenderingImage] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const promo = result.values?.promotion_text;
  const isListView = view === "list";

  const title = result.name || result.company?.name || "";
  const totalValue = Number(result.values?.total_value ?? 0);
  const rawCurrency = String(
    result.currency
      ?? (result as any)?.additional_value?.currency
      ?? (result.values as { currency?: string } | undefined)?.currency
      ?? ""
  ).trim().toUpperCase();
  const resultCurrency = rawCurrency === "COP" ? "COP" : "USD";
  const exchangeRateRaw = Number(
    (result.values as { exchangeRate?: number; exchange_rate?: number } | undefined)?.exchangeRate
      ?? (result.values as { exchangeRate?: number; exchange_rate?: number } | undefined)?.exchange_rate
      ?? 0
  );
  const exchangeRate = Number.isFinite(exchangeRateRaw) && exchangeRateRaw > 0 ? exchangeRateRaw : null;
  const persons = Array.isArray(result.values?.ages) ? result.values.ages.length : 1;
  const totalCOP = resultCurrency === "COP"
    ? Math.round(totalValue)
    : (exchangeRate ? Math.round(totalValue * exchangeRate) : null);
  const totalUSD = resultCurrency === "USD" ? totalValue : null;
  const oldValue = Number((result.values as { total_value_old?: number } | undefined)?.total_value_old ?? 0);
  const oldCop = oldValue > 0
    ? (resultCurrency === "COP" ? Math.round(oldValue) : (exchangeRate ? Math.round(oldValue * exchangeRate) : null))
    : null;
  const commission = result.values?.commission;
  const commissionPercent = result.values?.commission_percent;
  const commissionAmount = Number(commission ?? 0) || 0;
  const commissionCop = commissionAmount > 0
    ? (resultCurrency === "COP" ? Math.round(commissionAmount) : (exchangeRate ? Math.round(commissionAmount * exchangeRate) : null))
    : null;
  const hasComparatives = Boolean(result.comparatives?.length);
  const filteredComparatives = useMemo(
    () => (result.comparatives ?? []).filter((coverage) => coverage.in_results === 1),
    [result.comparatives]
  );

  const handleDownloadPdfClick = async () => {
    if (downloadingPdf) return;
    try {
      setPdfError(null);
      setDownloadingPdf(true);
      const { blob, filename } = await insuranceService.downloadPlanDetailPdf(result, language);
      const fileUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      const safeFileName = filename.trim() ? filename.trim() : "detalle-plan.pdf";
      anchor.href = fileUrl;
      anchor.download = safeFileName.toLowerCase().endsWith(".pdf") ? safeFileName : `${safeFileName}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(fileUrl);
    } catch (error) {
      console.error("Error descargando PDF del plan", error);
      setPdfError("No se pudo descargar el PDF del detalle del plan.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleOpenImageClick = async () => {
    if (renderingImage) return;
    try {
      setImageError(null);
      setRenderingImage(true);
      const rootStyles = getComputedStyle(document.documentElement);
      const themeColorStart = rootStyles.getPropertyValue("--color-secondary").trim() || "#113a6d";
      const themeColorEnd = rootStyles.getPropertyValue("--color-primary").trim() || "#0d9488";

      try {
        const { blob, filename } = await insuranceService.downloadPlanDetailImage(
          result.id,
          title || result.name || "plan",
          language
        );
        const downloadUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        const safeFileName = filename.trim() ? filename.trim() : `detalle-plan-${toFileSlug(title || "plan")}.jpg`;
        anchor.href = downloadUrl;
        anchor.download = safeFileName.toLowerCase().endsWith(".jpg")
          || safeFileName.toLowerCase().endsWith(".jpeg")
          ? safeFileName
          : `${safeFileName}.jpg`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(downloadUrl);
        return;
      } catch (backendError) {
        console.error("No se pudo generar la imagen en backend.", backendError);
        if (!import.meta.env.DEV) {
          throw backendError;
        }
      }

      const coverages = (result.comparatives ?? []).map((coverage) => ({
        label: String(coverage.text || coverage.name || "Cobertura"),
        value: formatCoverageValue(coverage.value1 ?? coverage.value2),
      }));
      const logoUrl = await resolveLogoForImage(result.company?.logo_url ?? result.company?.logo ?? null);

      const imageDesign = {
        title: title || "Plan",
        logoUrl,
        coverages,
        language,
        colorStart: themeColorStart,
        colorEnd: themeColorEnd,
      };
      const primaryImage = buildPlanDetailImageSvg(imageDesign);
      let jpgBlob: Blob;
      try {
        jpgBlob = await renderSvgToJpegBlob(primaryImage.svg, primaryImage.width, primaryImage.height);
      } catch (primaryError) {
        if (!logoUrl) throw primaryError;
        const fallbackImage = buildPlanDetailImageSvg({ ...imageDesign, logoUrl: null });
        jpgBlob = await renderSvgToJpegBlob(fallbackImage.svg, fallbackImage.width, fallbackImage.height);
      }

      const imageUrl = URL.createObjectURL(jpgBlob);
      const anchor = document.createElement("a");
      anchor.href = imageUrl;
      anchor.download = `detalle-plan-${toFileSlug(title || "plan")}.jpg`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(imageUrl);
    } catch (error) {
      console.error("Error generando imagen del plan", error);
      setImageError("No se pudo generar la imagen del detalle del plan en el servidor.");
    } finally {
      setRenderingImage(false);
    }
  };

  const ComparativesBlock = (
    <div className="flex flex-col gap-4">
      {filteredComparatives.length ? (
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          {filteredComparatives.slice(0, 6).map((coverage) => (
            <li key={coverage.id}>
              {coverage.name || coverage.text}
              <strong>{coverage.value1 ? ` ${coverage.value1}` : ""}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-gray-500">Sin comparativos</div>
      )}
    </div>
  );

  const PriceBlock = (
    <div className={`bg-gray-50 rounded-xl p-4 text-left ${isListView ? "h-full flex flex-col" : ""}`}>
      {oldCop && <div className="text-xs text-red-400 line-through mb-1">{currencyCOP(oldCop)}</div>}
      {totalCOP !== null ? (
        <div>
          <div className="text-2xl font-bold text-[var(--color-secondary)]">{currencyCOP(totalCOP)}</div>
          {totalUSD !== null && (
            <div className="text-xs text-gray-500 mt-1">USD {totalUSD.toFixed(1)}</div>
          )}
        </div>
      ) : (
        <div>
          <div className="text-2xl font-bold text-[var(--color-secondary)]">{currencyUSD(totalValue)}</div>
          <div className="text-xs text-gray-500 mt-1">USD</div>
        </div>
      )}
      {commissionCop !== null && commissionCop !== undefined && commissionCop > 0 && (
        <div className="text-xs text-[var(--color-primary)] mt-2">
          Ganancia ({commissionPercent}%): <span className="font-semibold">{currencyCOP(Math.round(commissionCop))}</span>
        </div>
      )}
      <button
        className="btn bg-[var(--color-primary)] hover:opacity-90 border-none text-[var(--color-primary-content)] w-full mt-3 rounded-full"
        onClick={() => onBuy?.(result)}
      >
        Emitir
      </button>
      <button
        type="button"
        className="btn btn-outline w-full mt-2 rounded-full"
        onClick={() => setShowDetails(true)}
      >
        Ver detalle del plan
      </button>
    </div>
  );

  return (
    <div className="rounded-2xl bg-white shadow-md p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-[var(--color-secondary)]">{title}</h3>
          <div className="mt-1 text-sm text-gray-600 flex items-center gap-2">
            <span>Para {persons} persona{persons !== 1 ? "s" : ""}</span>
            {promo && <span className="badge badge-success badge-sm">{promo}</span>}
          </div>
        </div>
        {selectable && (
          <label className={`flex items-center gap-2 text-sm font-medium ${selectionDisabled ? "text-gray-400" : "text-[var(--color-secondary)]"}`}>
            <input
              type="checkbox"
              className="checkbox checkbox-sm checkbox-primary"
              checked={selected}
              onChange={(event) => onSelectChange?.(event.target.checked)}
              disabled={selectionDisabled}
            />
            <span>Seleccionar</span>
          </label>
        )}
      </div>

      {isListView ? (
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
          <div className="flex-1 md:basis-[70%]">{ComparativesBlock}</div>
          <div className="md:basis-[30%] md:max-w-xs w-full">{PriceBlock}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {ComparativesBlock}
          {PriceBlock}
        </div>
      )}
      {showDetails && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="bg-base-100 rounded-[26px] shadow-2xl w-full max-w-3xl my-2 max-h-[calc(100dvh-2rem)] overflow-hidden flex flex-col border border-base-300/30"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative shrink-0 overflow-hidden px-6 py-5 bg-gradient-to-r from-[var(--color-secondary)] to-[var(--color-primary)] text-white">
              <div className="absolute -top-10 -right-10 h-28 w-28 rounded-full bg-white/20 blur-2xl" />
              <div className="absolute -bottom-12 -left-8 h-24 w-24 rounded-full bg-white/10 blur-xl" />
              <div className="relative z-10 flex items-start justify-between gap-4">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">Detalle del plan</div>
                  <h3 className="text-lg font-bold leading-tight">{title || "Plan"}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-white/20 px-3 py-1">
                      {persons} persona{persons !== 1 ? "s" : ""}
                    </span>
                    {totalCOP !== null ? (
                      <span className="rounded-full bg-white/20 px-3 py-1">{currencyCOP(totalCOP)}</span>
                    ) : (
                      <span className="rounded-full bg-white/20 px-3 py-1">{currencyUSD(totalValue)}</span>
                    )}
                    <span className="rounded-full bg-white/20 px-3 py-1">
                      {(result.comparatives ?? []).length} cobertura{(result.comparatives ?? []).length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
                <button type="button" className="btn btn-sm btn-circle btn-ghost text-white hover:bg-white/20" onClick={() => setShowDetails(false)}>
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-6 overflow-auto bg-gradient-to-b from-white to-slate-50">
              {hasComparatives ? (
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                  {(result.comparatives ?? []).map((coverage) => (
                    <li
                      key={coverage.id}
                      className="rounded-xl border border-base-300/30 bg-white p-3 flex items-start justify-between gap-3 shadow-sm"
                    >
                      <span className="text-[13px] leading-snug font-medium text-[var(--color-secondary)]">{coverage.text || coverage.name}</span>
                      <span className="shrink-0 rounded-full bg-[var(--color-primary)]/10 px-2.5 py-1 text-xs font-bold text-[var(--color-primary)]">
                        {formatCoverageValue(coverage.value1 ?? coverage.value2)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-gray-500">Sin coberturas disponibles para mostrar.</div>
              )}
            </div>
            <div className="shrink-0 px-6 py-4 border-t border-base-300/30 bg-white flex flex-wrap items-center justify-between gap-3">
              {pdfError && <div className="text-sm text-error font-medium">{pdfError}</div>}
              {imageError && <div className="text-sm text-error font-medium">{imageError}</div>}
              <div className="ml-auto flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={`btn rounded-full border-none bg-[var(--color-secondary)] text-white hover:opacity-90 ${downloadingPdf ? "loading" : ""}`}
                  onClick={handleDownloadPdfClick}
                  disabled={downloadingPdf}
                  title="Descargar PDF del detalle del plan"
                >
                  {!downloadingPdf && <FaDownload className="mr-1" />}
                  PDF
                </button>
                <button
                  type="button"
                  className={`btn rounded-full border-none bg-emerald-600 text-white hover:opacity-90 ${renderingImage ? "loading" : ""}`}
                  onClick={handleOpenImageClick}
                  disabled={renderingImage}
                  title="Ver detalle del plan en imagen"
                >
                  {!renderingImage && <FaImage className="mr-1" />}
                  Imagen
                </button>
                <button
                  type="button"
                  className="btn btn-outline rounded-full border-[var(--color-secondary)] text-[var(--color-secondary)]"
                  onClick={() => setShowDetails(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultCard;
