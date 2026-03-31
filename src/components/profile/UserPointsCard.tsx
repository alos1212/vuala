import React from "react";
import type { UserPointsData } from "../../types/userPoints";

interface UserPointsCardProps {
  title: string;
  data?: UserPointsData;
  isLoading?: boolean;
  onPageChange?: (page: number) => void;
}

const formatDate = (value?: string | null): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const UserPointsCard: React.FC<UserPointsCardProps> = ({ title, data, isLoading = false, onPageChange }) => {
  const movements = data?.movements?.data ?? [];
  const meta = data?.movements?.meta;
  const currentPage = meta?.current_page ?? 1;
  const lastPage = meta?.last_page ?? 1;
  const pointsBalance = data?.wallet?.points_balance ?? 0;
  const pointsEarned = data?.totals?.points_earned ?? 0;
  const pointsDeducted = data?.totals?.points_deducted ?? 0;
  const hasAgency = Boolean(data?.agency);

  return (
    <div className="card bg-base-100 shadow border border-base-200">
      <div className="card-body space-y-4">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="card-title">{title}</h3>
            <p className="text-sm text-base-content/60">
              {hasAgency ? `Agencia: ${data?.agency?.name}` : "Este usuario no tiene agencia asociada."}
            </p>
          </div>
          <div className={`badge ${data?.enabled ? "badge-success" : "badge-ghost"}`}>
            {data?.enabled ? "Acumula puntos activo" : "Acumula puntos inactivo"}
          </div>
        </div>

        <div className="stats stats-vertical lg:stats-horizontal shadow bg-base-200/40 border border-base-200">
          <div className="stat">
            <div className="stat-title">Saldo actual</div>
            <div className="stat-value text-primary text-2xl">{pointsBalance}</div>
            <div className="stat-desc">Puntos disponibles</div>
          </div>
          <div className="stat">
            <div className="stat-title">Puntos ganados</div>
            <div className="stat-value text-success text-2xl">{pointsEarned}</div>
            <div className="stat-desc">Acumulados históricos</div>
          </div>
          <div className="stat">
            <div className="stat-title">Puntos restados</div>
            <div className="stat-value text-error text-2xl">{pointsDeducted}</div>
            <div className="stat-desc">Redenciones y reversas</div>
          </div>
        </div>

        <div className="overflow-x-auto border border-base-200 rounded-lg">
          <table className="table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Venta</th>
                <th className="text-right">Puntos</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    <span className="loading loading-spinner loading-lg text-primary" />
                  </td>
                </tr>
              )}

              {!isLoading && movements.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-base-content/60">
                    No hay movimientos de puntos para este usuario.
                  </td>
                </tr>
              )}

              {!isLoading &&
                movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{formatDate(movement.created_at)}</td>
                    <td>
                      <span className={`badge ${movement.direction === "credit" ? "badge-success" : "badge-error"}`}>
                        {movement.type_label}
                      </span>
                    </td>
                    <td>{movement.description || "-"}</td>
                    <td>{movement.purchase_id ? `#${movement.purchase_id}` : "-"}</td>
                    <td className={`text-right font-semibold ${movement.points >= 0 ? "text-success" : "text-error"}`}>
                      {movement.points >= 0 ? "+" : ""}
                      {movement.points}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-base-content/60">
            Página {currentPage} de {lastPage}
          </span>
          <div className="flex gap-2">
            <button
              className="btn btn-sm"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
            >
              Anterior
            </button>
            <button
              className="btn btn-sm"
              disabled={currentPage >= lastPage || isLoading}
              onClick={() => onPageChange?.(Math.min(lastPage, currentPage + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPointsCard;

