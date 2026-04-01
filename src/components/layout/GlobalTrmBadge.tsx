import React, { useMemo } from "react";
import { FaChartLine } from "react-icons/fa";
import { useAuthStore } from "../../stores/authStore";

interface GlobalTrmBadgeProps {
  compact?: boolean;
  className?: string;
}

const GlobalTrmBadge: React.FC<GlobalTrmBadgeProps> = ({ compact = false, className = "" }) => {
  const user = useAuthStore((state) => state.user);

  const trmLabel = useMemo(() => {
    if (user?.company?.name) return user.company.name;
    if (user?.company_id) return `Compania #${user.company_id}`;
    return "Panel CRM";
  }, [user?.company?.name, user?.company_id]);

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
        <div className={`${compact ? "text-[10px]" : "text-[11px]"} app-trm-badge__title font-bold uppercase tracking-wide`}>Workspace</div>
        <div className={`${compact ? "text-[10px]" : "text-[11px]"} app-trm-badge__date font-semibold`}>{todayLabel}</div>
        <div className={`${compact ? "text-sm" : "text-base"} app-trm-badge__value font-extrabold`}>{trmLabel}</div>
      </div>
    </div>
  );
};

export default GlobalTrmBadge;
