import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BiArrowBack, BiUserCircle } from "react-icons/bi";
import UserPointsCard from "../../components/profile/UserPointsCard";
import { userService } from "../../services/userService";
import { companyService } from "../../services/companyService";

const UserProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { id, companyId, userId } = useParams<{ id?: string; companyId?: string; userId?: string }>();
  const adminUserId = Number(id);
  const companyUserId = Number(userId);
  const companyNumericId = Number(companyId);

  const isAdminProfile = Number.isFinite(adminUserId) && adminUserId > 0;
  const isCompanyProfile = Number.isFinite(companyUserId) && companyUserId > 0;
  const isScopedCompanyRoute = Number.isFinite(companyNumericId) && companyNumericId > 0;
  const resolvedUserId = isAdminProfile ? adminUserId : isCompanyProfile ? companyUserId : 0;

  const [pointsPage, setPointsPage] = useState(1);

  const profileQuery = useQuery({
    queryKey: ["user-profile-with-points", { adminUserId, companyNumericId, companyUserId, pointsPage }],
    queryFn: async () => {
      if (isAdminProfile) {
        return userService.getUserProfileWithPoints(adminUserId, { page: pointsPage, per_page: 10 });
      }

      if (isScopedCompanyRoute) {
        const data = await companyService.getCompanyUserProfile(companyNumericId, companyUserId);
        return { user: data.user ?? data, points: undefined };
      }

      const data = await companyService.getMyCompanyUserProfile(companyUserId);
      return { user: data.user ?? data, points: undefined };
    },
    enabled: resolvedUserId > 0 && (isAdminProfile || isCompanyProfile),
    placeholderData: (previousData) => previousData,
  });

  if (profileQuery.isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!profileQuery.data) {
    return (
      <div className="container mx-auto p-6">
        <div className="alert alert-error">
          <span>No se pudo cargar el perfil del usuario.</span>
        </div>
      </div>
    );
  }

  const { user, points } = profileQuery.data;
  const backPath = isAdminProfile
    ? "/users"
    : isScopedCompanyRoute
      ? `/companies/${companyNumericId}`
      : "/companies";

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-circle" onClick={() => navigate(backPath)}>
            <BiArrowBack className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BiUserCircle className="w-6 h-6 text-primary" />
              Perfil de usuario
            </h1>
            <p className="text-base-content/60">Detalle y movimientos de puntos del usuario.</p>
          </div>
        </div>
      </div>

      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-base-content/60">Nombre</div>
            <div className="font-semibold">{user.name}</div>
          </div>
          <div>
            <div className="text-sm text-base-content/60">Correo</div>
            <div className="font-semibold">{user.email}</div>
          </div>
          <div>
            <div className="text-sm text-base-content/60">Estado</div>
            <div className="font-semibold">{user.status === "inactive" ? "Inactivo" : "Activo"}</div>
          </div>
          <div>
            <div className="text-sm text-base-content/60">Compañía</div>
            <div className="font-semibold">{user.company?.name || (user.company_id ? `Compañía #${user.company_id}` : "Sin compañía")}</div>
          </div>
        </div>
      </div>

      {points && (
        <UserPointsCard
          title={`Puntos de ${user.name}`}
          data={points}
          isLoading={profileQuery.isFetching}
          onPageChange={setPointsPage}
        />
      )}
    </div>
  );
};

export default UserProfilePage;
