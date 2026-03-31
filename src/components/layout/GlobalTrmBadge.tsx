import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { FaChartLine } from "react-icons/fa";
import { exchangeRateService } from "../../services/exchangeRateService";
import { useAuthStore } from "../../stores/authStore";

interface GlobalTrmBadgeProps {
  compact?: boolean;
  className?: string;
}

const GlobalTrmBadge: React.FC<GlobalTrmBadgeProps> = ({ compact = false, className = "" }) => {
  const user = useAuthStore((state) => state.user);
  const organizationId = user?.agency_id ?? null;

  const { data, isFetching } = useQuery({
    queryKey: ["global-current-trm", organizationId],
    queryFn: () =>
      organizationId
        ? exchangeRateService.getCurrentByOrganization(organizationId, { currency: "COP" })
        : exchangeRateService.getCurrent({ currency: "COP" }),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });

  const trmLabel = useMemo(() => {
    if (isFetching && !data) return "Cargando...";
    const value = Number(data?.value ?? NaN);
    if (!Number.isFinite(value)) return "No disponible";
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }, [data, isFetching]);

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CO", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "America/Bogota",
      }).format(new Date()),
    [],
  );

  return (
    <div
      className={`${compact ? "app-trm-badge app-trm-badge--compact" : "app-trm-badge"} ${className}`.trim()}
    >
      <div className={`${compact ? "h-8 w-8" : "h-9 w-9"} app-trm-badge__icon flex items-center justify-center rounded-full text-white`}>
        <FaChartLine className={compact ? "text-xs" : "text-sm"} />
      </div>
      <div className="leading-tight">
        <div className={`${compact ? "text-[10px]" : "text-[11px]"} app-trm-badge__title font-bold uppercase tracking-wide`}>Dólar Hoy</div>
        <div className={`${compact ? "text-[10px]" : "text-[11px]"} app-trm-badge__date font-semibold`}>{todayLabel}</div>
        <div className={`${compact ? "text-sm" : "text-base"} app-trm-badge__value font-extrabold`}>{trmLabel}</div>
      </div>
    </div>
  );
};

export default GlobalTrmBadge;
