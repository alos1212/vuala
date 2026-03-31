import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BiEdit, BiPlus, BiTrash, BiUserCheck, BiUserCircle, BiUserX } from "react-icons/bi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import AgencyUserModal, { type AgencyUserFormValues } from "../../components/agencies/AgencyUserModal";
import { roleService } from "../../services/roleService";
import { userService } from "../../services/userService";
import { useAuthStore } from "../../stores/authStore";
import type { Role, User } from "../../types/auth";

const PAGE_SIZE = 20;
const SERVER_FETCH_SIZE = 500;

type StatusFilter = "all" | "active" | "inactive";

interface UserFilters {
  search: string;
  status: StatusFilter;
  role: string;
}

type UserConfirmAction =
  | { type: "delete"; user: User }
  | { type: "toggle-status"; user: User; currentStatus: "active" | "inactive" };

const defaultFilters: UserFilters = {
  search: "",
  status: "all",
  role: "",
};

const extractUserRoles = (user: User): Role[] => {
  if (Array.isArray(user.role)) return user.role.filter(Boolean) as Role[];
  const rawRole = (user as unknown as { role?: Role }).role;
  return rawRole ? [rawRole] : [];
};

const getPrimaryRole = (user: User): Role | null => {
  const roles = extractUserRoles(user);
  return roles.length > 0 ? roles[0] : null;
};

const isAgencyProfileUser = (user: User): boolean => {
  const role = getPrimaryRole(user);
  return Boolean(user.agency_id) || role?.type === 1;
};

const resolveUserStatus = (user: User): "active" | "inactive" => {
  const rawStatus = (user as unknown as { status?: unknown; is_active?: unknown }).status;
  const isActive = (user as unknown as { is_active?: unknown }).is_active;

  if (rawStatus === "inactive" || rawStatus === 0 || rawStatus === "0") return "inactive";
  if (rawStatus === "active" || rawStatus === 1 || rawStatus === "1") return "active";
  if (isActive === false || isActive === 0 || isActive === "0") return "inactive";
  return "active";
};

const getSpanishApiErrorMessage = (error: any, fallback: string): string => {
  const errorData = error?.response?.data;
  const validationErrors = errorData?.errors;

  if (validationErrors && typeof validationErrors === "object") {
    for (const key of Object.keys(validationErrors)) {
      const fieldErrors = validationErrors[key];
      if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
        return String(fieldErrors[0]);
      }
    }
  }

  const rawMessage = String(errorData?.message || "").trim();
  const messages: Record<string, string> = {
    "Validation errors": "Hay errores de validación en el formulario.",
    "The given data was invalid.": "Hay errores de validación en el formulario.",
    "Unauthenticated.": "Tu sesión ha expirado. Inicia sesión de nuevo.",
    "User not found": "No se encontró el usuario.",
  };

  return messages[rawMessage] || rawMessage || fallback;
};

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuthStore();

  const canReadUsers = hasPermission("users.read");
  const canCreateUsers = hasPermission("users.create");
  const canUpdateUsers = hasPermission("users.update");
  const canDeleteUsers = hasPermission("users.delete");

  const [draftFilters, setDraftFilters] = useState<UserFilters>(defaultFilters);
  const [filters, setFilters] = useState<UserFilters>(defaultFilters);
  const [includeAgencyProfiles, setIncludeAgencyProfiles] = useState(false);
  const [page, setPage] = useState(1);

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmAction, setConfirmAction] = useState<UserConfirmAction | null>(null);

  const rolesQuery = useQuery({
    queryKey: ["roles", "users-page"],
    queryFn: roleService.getRoles,
    retry: 1,
  });

  const usersQuery = useQuery({
    queryKey: ["users", "list-admin", filters],
    queryFn: () =>
      userService.getUsers({
        page: 1,
        per_page: SERVER_FETCH_SIZE,
        search: filters.search.trim() || undefined,
        status: filters.status !== "all" ? filters.status : undefined,
        role: filters.role || undefined,
      }),
    refetchOnWindowFocus: false,
  });

  const createUserMutation = useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      toast.success("Usuario creado correctamente.");
      queryClient.invalidateQueries({ queryKey: ["users", "list-admin"] });
      closeUserModal();
    },
    onError: (error) => {
      toast.error(getSpanishApiErrorMessage(error, "No se pudo crear el usuario."));
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: Parameters<typeof userService.updateUser>[1] }) =>
      userService.updateUser(userId, payload),
    onSuccess: () => {
      toast.success("Usuario actualizado correctamente.");
      queryClient.invalidateQueries({ queryKey: ["users", "list-admin"] });
      closeUserModal();
    },
    onError: (error) => {
      toast.error(getSpanishApiErrorMessage(error, "No se pudo actualizar el usuario."));
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: number) => userService.updateUserStatus(id),
    onSuccess: () => {
      toast.success("Estado del usuario actualizado.");
      queryClient.invalidateQueries({ queryKey: ["users", "list-admin"] });
    },
    onError: (error) => {
      toast.error(getSpanishApiErrorMessage(error, "No se pudo cambiar el estado."));
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: userService.deleteUser,
    onSuccess: () => {
      toast.success("Usuario eliminado.");
      queryClient.invalidateQueries({ queryKey: ["users", "list-admin"] });
    },
    onError: (error) => {
      toast.error(getSpanishApiErrorMessage(error, "No se pudo eliminar el usuario."));
    },
  });

  const rawUsers = usersQuery.data?.data ?? [];

  const roleOptions = useMemo(() => {
    const fromApi = rolesQuery.data ?? [];
    const mapById = new Map<number, Role>();

    fromApi.forEach((role) => {
      mapById.set(role.id, role);
    });

    rawUsers.forEach((user) => {
      extractUserRoles(user).forEach((role) => {
        if (!mapById.has(role.id)) {
          mapById.set(role.id, role);
        }
      });
    });

    return Array.from(mapById.values()).sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [rolesQuery.data, rawUsers]);

  const visibleRoleOptions = useMemo(
    () => (includeAgencyProfiles ? roleOptions : roleOptions.filter((role) => role.type !== 1)),
    [includeAgencyProfiles, roleOptions],
  );

  const visibleUsers = useMemo(() => {
    if (includeAgencyProfiles) return rawUsers;
    return rawUsers.filter((user) => !isAgencyProfileUser(user));
  }, [includeAgencyProfiles, rawUsers]);

  const totalVisible = visibleUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalVisible / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (includeAgencyProfiles) return;

    const draftRoleId = Number(draftFilters.role);
    const appliedRoleId = Number(filters.role);
    const isDraftAgencyRole = roleOptions.some((role) => role.id === draftRoleId && role.type === 1);
    const isAppliedAgencyRole = roleOptions.some((role) => role.id === appliedRoleId && role.type === 1);

    if (isDraftAgencyRole) {
      setDraftFilters((prev) => ({ ...prev, role: "" }));
    }

    if (isAppliedAgencyRole) {
      setFilters((prev) => ({ ...prev, role: "" }));
      setPage(1);
    }
  }, [includeAgencyProfiles, draftFilters.role, filters.role, roleOptions]);

  const pagedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return visibleUsers.slice(start, start + PAGE_SIZE);
  }, [page, visibleUsers]);

  const closeUserModal = () => {
    setIsUserModalOpen(false);
    setEditingUser(null);
  };

  const openCreateUserModal = () => {
    const availableNonAgencyRoles = roleOptions.filter((role) => role.type !== 1);
    if (availableNonAgencyRoles.length === 0) {
      toast.error("No hay roles administrativos disponibles para crear usuarios.");
      return;
    }
    setEditingUser(null);
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (user: User) => {
    setEditingUser(user);
    setIsUserModalOpen(true);
  };

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setFilters(draftFilters);
    setPage(1);
  };

  const handleResetFilters = () => {
    setDraftFilters(defaultFilters);
    setFilters(defaultFilters);
    setIncludeAgencyProfiles(false);
    setPage(1);
  };

  const handleDeleteUser = (user: User) => {
    setConfirmAction({ type: "delete", user });
  };

  const handleToggleUserStatus = (user: User, currentStatus: "active" | "inactive") => {
    setConfirmAction({ type: "toggle-status", user, currentStatus });
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;

    const action = confirmAction;
    setConfirmAction(null);

    if (action.type === "delete") {
      deleteUserMutation.mutate(action.user.id);
      return;
    }

    toggleStatusMutation.mutate(action.user.id);
  };

  const modalRoles = useMemo(() => {
    if (!editingUser) return roleOptions.filter((role) => role.type !== 1);
    return isAgencyProfileUser(editingUser)
      ? roleOptions.filter((role) => role.type === 1)
      : roleOptions.filter((role) => role.type !== 1);
  }, [editingUser, roleOptions]);

  const handleUserSubmit = (values: AgencyUserFormValues) => {
    const selectedRoleId = Array.isArray(values.roles) ? values.roles[0] : undefined;
    const selectedRole = roleOptions.find((role) => role.id === selectedRoleId);
    const selectedRoleIsAgency = selectedRole?.type === 1;

    const payload: {
      name: string;
      email: string;
      password?: string;
      password_confirmation?: string;
      roles?: number[];
      status?: "active" | "inactive";
      birthdate?: string;
      birth_date?: string;
      gender?: "M" | "F";
      agency_id?: number | null;
    } = {
      name: values.name,
      email: values.email,
      roles: values.roles,
      status: values.status,
      birthdate: values.birthdate || undefined,
      birth_date: values.birthdate || undefined,
      gender: values.gender || undefined,
      agency_id: selectedRoleIsAgency ? editingUser?.agency_id ?? null : null,
    };

    if (values.password) {
      payload.password = values.password;
      payload.password_confirmation = values.password_confirmation || "";
    }

    if (editingUser) {
      updateUserMutation.mutate({ userId: editingUser.id, payload });
      return;
    }

    createUserMutation.mutate({
      name: payload.name,
      email: payload.email,
      password: payload.password || "",
      password_confirmation: payload.password_confirmation || "",
      roles: payload.roles,
      agency_id: payload.agency_id,
      status: payload.status,
      birthdate: payload.birthdate,
      birth_date: payload.birth_date,
      gender: payload.gender,
    });
  };

  const currentRangeFrom = totalVisible === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const currentRangeTo = Math.min(page * PAGE_SIZE, totalVisible);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usuarios del sistema</h1>
          <p className="text-base-content/60">Gestiona administradores y usuarios de roles internos.</p>
        </div>
        {canCreateUsers && (
          <button className="btn btn-primary" onClick={openCreateUserModal}>
            <BiPlus className="w-5 h-5" />
            Crear usuario
          </button>
        )}
      </div>

      <form className="card bg-base-100 shadow border border-base-200" onSubmit={handleSearch}>
        <div className="card-body grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="form-control">
            <span className="label-text font-semibold">Buscar</span>
            <input
              className="input input-bordered"
              placeholder="Nombre o correo"
              value={draftFilters.search}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, search: e.target.value }))}
            />
          </label>

          <label className="form-control">
            <span className="label-text font-semibold">Estado</span>
            <select
              className="select select-bordered"
              value={draftFilters.status}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, status: e.target.value as StatusFilter }))}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>

          <label className="form-control">
            <span className="label-text font-semibold">Rol</span>
            <select
              className="select select-bordered"
              value={draftFilters.role}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="">Todos</option>
              {visibleRoleOptions.map((role) => (
                <option key={role.id} value={String(role.id)}>
                  {role.display_name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-control justify-end">
            <span className="label-text font-semibold">Perfiles de agencia</span>
            <label className="cursor-pointer label justify-start gap-3 px-0">
              <input
                type="checkbox"
                className="toggle toggle-primary"
                checked={includeAgencyProfiles}
                onChange={(e) => {
                  setIncludeAgencyProfiles(e.target.checked);
                  setPage(1);
                }}
              />
              <span className="label-text">{includeAgencyProfiles ? "Incluidos" : "Ocultos"}</span>
            </label>
          </label>

          <div className="lg:col-span-4 flex items-center justify-end gap-2">
            <button type="button" className="btn btn-ghost" onClick={handleResetFilters}>
              Limpiar
            </button>
            <button type="submit" className="btn btn-primary" disabled={usersQuery.isFetching}>
              {usersQuery.isFetching ? <span className="loading loading-spinner loading-sm" /> : "Buscar"}
            </button>
          </div>
        </div>
      </form>

      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body p-0">
          <div className="px-6 py-4 border-b border-base-200 text-sm text-base-content/70">
            Mostrando {currentRangeFrom}-{currentRangeTo} de {totalVisible} usuarios
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Agencia</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.isLoading && (
                  <tr>
                    <td colSpan={6} className="text-center py-10">
                      <span className="loading loading-spinner loading-lg text-primary" />
                    </td>
                  </tr>
                )}

                {!usersQuery.isLoading && pagedUsers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-base-content/60">
                      No hay usuarios para mostrar con los filtros actuales.
                    </td>
                  </tr>
                )}

                {!usersQuery.isLoading &&
                  pagedUsers.map((user) => {
                    const role = getPrimaryRole(user);
                    const isAgencyProfile = isAgencyProfileUser(user);
                    const status = resolveUserStatus(user);
                    const agencyName = (user as unknown as { agency?: { name?: string } }).agency?.name;
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="font-semibold">{user.name}</div>
                          {isAgencyProfile && <span className="badge badge-warning badge-sm mt-1">Perfil agencia</span>}
                        </td>
                        <td>{user.email}</td>
                        <td>{role?.display_name || "-"}</td>
                        <td>{agencyName || (user.agency_id ? `Agencia #${user.agency_id}` : "Sin agencia")}</td>
                        <td>
                          <span className={`badge ${status === "inactive" ? "badge-ghost" : "badge-success"}`}>
                            {status === "inactive" ? "Inactivo" : "Activo"}
                          </span>
                        </td>
                        <td>
                          <div className="flex justify-end gap-2">
                            {canReadUsers && (
                              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/users/${user.id}/profile`)}>
                                <BiUserCircle className="w-4 h-4" />
                                Perfil
                              </button>
                            )}
                            {canUpdateUsers && (
                              <button className="btn btn-ghost btn-sm" onClick={() => openEditUserModal(user)}>
                                <BiEdit className="w-4 h-4" />
                                Editar
                              </button>
                            )}
                            {canUpdateUsers && (
                              <button
                                className={`btn btn-sm ${status === "inactive" ? "btn-success" : "btn-warning"}`}
                                onClick={() => handleToggleUserStatus(user, status)}
                              >
                                {status === "inactive" ? <BiUserCheck className="w-4 h-4" /> : <BiUserX className="w-4 h-4" />}
                                {status === "inactive" ? "Activar" : "Inactivar"}
                              </button>
                            )}
                            {canDeleteUsers && (
                              <button className="btn btn-error btn-sm" onClick={() => handleDeleteUser(user)}>
                                <BiTrash className="w-4 h-4" />
                                Eliminar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 border-t border-base-200 flex items-center justify-between">
            <span className="text-sm text-base-content/60">Página {page} de {totalPages}</span>
            <div className="flex gap-2">
              <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                Anterior
              </button>
              <button
                className="btn btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>

      <AgencyUserModal
        isOpen={isUserModalOpen}
        onClose={closeUserModal}
        onSubmit={handleUserSubmit}
        roles={modalRoles}
        user={editingUser}
        isSaving={createUserMutation.isPending || updateUserMutation.isPending}
      />

      {confirmAction && (
        <div className="modal modal-open">
          <div className="modal-box max-w-md">
            <h3 className="font-bold text-lg">
              {confirmAction.type === "delete" ? "Confirmar eliminación" : "Confirmar acción"}
            </h3>
            <p className="py-4 text-sm text-base-content/80">
              {confirmAction.type === "delete"
                ? `¿Estás seguro de eliminar al usuario "${confirmAction.user.name}"? Esta acción no se puede deshacer.`
                : confirmAction.currentStatus === "inactive"
                  ? `¿Deseas activar al usuario "${confirmAction.user.name}"?`
                  : `¿Deseas inactivar al usuario "${confirmAction.user.name}"?`}
            </p>
            <div className="modal-action">
              <button
                className="btn btn-ghost"
                onClick={() => setConfirmAction(null)}
                disabled={deleteUserMutation.isPending || toggleStatusMutation.isPending}
              >
                Cancelar
              </button>
              <button
                className={`btn ${confirmAction.type === "delete" ? "btn-error" : "btn-primary"} ${
                  deleteUserMutation.isPending || toggleStatusMutation.isPending ? "loading" : ""
                }`}
                onClick={handleConfirmAction}
                disabled={deleteUserMutation.isPending || toggleStatusMutation.isPending}
              >
                {confirmAction.type === "delete"
                  ? "Eliminar"
                  : confirmAction.currentStatus === "inactive"
                    ? "Activar"
                    : "Inactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
