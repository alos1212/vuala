import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BiArrowBack, BiBuilding, BiEdit, BiGlobe } from 'react-icons/bi';
import { agencyService } from '../../services/agencyService';
import AgencyUserModal from '../../components/agencies/AgencyUserModal';
import type { User, Role } from '../../types/auth';
import { toast } from 'react-hot-toast';
import { geoService } from '../../services/geoService';
import { roleService } from '../../services/roleService';
import type { Agency } from '../../types/agency';
import type { Country, State, City } from '../../types/zone';
import AgencyUsersTab from '../../components/agencies/AgencyUsersTab';
import { useAuth } from '../../hooks/useAuth';
import { resolveStorageUrl } from '../../utils/authHelpers';

interface AgencyDetailPageProps {
  selfMode?: boolean;
}

const AgencyDetailPage: React.FC<AgencyDetailPageProps> = ({ selfMode = false }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAuth();

  const numericId = Number(id);
  const hasValidId = Number.isFinite(numericId) && numericId > 0;
  const isSelfRoute = selfMode || !hasValidId;
  const canReadMyAgency = !isSelfRoute || hasPermission('my-agency.read');
  const canUpdateMyAgency = !isSelfRoute || hasPermission('my-agency.update');
  const canListMyAgencyUsers = !isSelfRoute || hasPermission('my-agency.users.list');
  const canCreateMyAgencyUsers = !isSelfRoute || hasPermission('my-agency.users.create');
  const canUpdateMyAgencyUsers = !isSelfRoute || hasPermission('my-agency.users.update');
  const canDeleteMyAgencyUsers = !isSelfRoute || hasPermission('my-agency.users.delete');
  const canReadUsersProfile = hasPermission('users.read');
  const canViewAgencyUserProfile = isSelfRoute
    ? (canListMyAgencyUsers || canUpdateMyAgencyUsers)
    : (hasPermission('agencies.list') || hasPermission('agencies.read') || hasPermission('agencies.update') || canReadUsersProfile);

  const agencyQueryKey = isSelfRoute ? ['my-agency'] : ['agency', numericId];
  const agencyUsersQueryKey = isSelfRoute ? ['my-agency-users'] : ['agency-users', numericId];

  const { data: agency, isLoading, error: agencyError } = useQuery<Agency>({
    queryKey: agencyQueryKey,
    queryFn: () => (isSelfRoute ? agencyService.getMyAgency() : agencyService.getAgency(numericId)),
    enabled: isSelfRoute ? canReadMyAgency : hasValidId,
  });

  const effectiveAgencyId = agency?.id ?? (hasValidId ? numericId : 0);

  const { data: agencyUsers } = useQuery<User[]>({
    queryKey: isSelfRoute ? agencyUsersQueryKey : ['agency-users', effectiveAgencyId],
    queryFn: () => (isSelfRoute ? agencyService.getMyAgencyUsers() : agencyService.getAgencyUsers(effectiveAgencyId)),
    enabled: isSelfRoute ? canListMyAgencyUsers : !!effectiveAgencyId,
  });

  const { data: countries } = useQuery<Country[]>({
    queryKey: ['countries'],
    queryFn: () => geoService.getCountries(),
  });

  const { data: states } = useQuery<State[]>({
    queryKey: ['states', agency?.country_id],
    queryFn: () => geoService.getStatesByCountry(Number(agency?.country_id)),
    enabled: !!agency?.country_id,
  });

  const { data: cities } = useQuery<City[]>({
    queryKey: ['cities', agency?.state_id],
    queryFn: () => geoService.getCitiesByState(Number(agency?.state_id)),
    enabled: !!agency?.state_id,
  });

  const { data: availableRoles = [] } = useQuery<Role[]>({
    queryKey: ['roles-available', 'agency-users'],
    queryFn: roleService.getAvailableRoles,
  });

  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const getSpanishApiErrorMessage = (error: any, fallback: string): string => {
    const errorData = error?.response?.data;
    const validationErrors = errorData?.errors;

    if (validationErrors && typeof validationErrors === 'object') {
      for (const key of Object.keys(validationErrors)) {
        const fieldErrors = validationErrors[key];
        if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
          return String(fieldErrors[0]);
        }
      }
    }

    const rawMessage = String(errorData?.message || '').trim();
    const messages: Record<string, string> = {
      'Validation errors': 'Hay errores de validación en el formulario.',
      'The given data was invalid.': 'Hay errores de validación en el formulario.',
      'Invalid credentials': 'Credenciales inválidas.',
      'Unauthenticated.': 'Tu sesión ha expirado. Inicia sesión de nuevo.',
    };

    return messages[rawMessage] || rawMessage || fallback;
  };

  const createUserMutation = useMutation({
    mutationFn: (payload: any) =>
      isSelfRoute
        ? agencyService.createMyAgencyUser(payload)
        : agencyService.createAgencyUser(effectiveAgencyId, payload),
    onSuccess: () => {
      toast.success('Usuario creado');
      queryClient.invalidateQueries({ queryKey: agencyUsersQueryKey });
      closeUserModal();
    },
    onError: (error: any) => {
      toast.error(getSpanishApiErrorMessage(error, 'No se pudo crear el usuario'));
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: any }) =>
      isSelfRoute
        ? agencyService.updateMyAgencyUser(userId, payload)
        : agencyService.updateAgencyUser(effectiveAgencyId, userId, payload),
    onSuccess: () => {
      toast.success('Usuario actualizado');
      queryClient.invalidateQueries({ queryKey: agencyUsersQueryKey });
      closeUserModal();
    },
    onError: (error: any) => {
      toast.error(getSpanishApiErrorMessage(error, 'No se pudo actualizar el usuario'));
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId: number) =>
      isSelfRoute
        ? agencyService.deleteMyAgencyUser(userId)
        : agencyService.deleteAgencyUser(effectiveAgencyId, userId),
    onSuccess: () => {
      toast.success('Usuario eliminado');
      queryClient.invalidateQueries({ queryKey: agencyUsersQueryKey });
    },
    onError: (error: any) => {
      toast.error(getSpanishApiErrorMessage(error, 'No se pudo eliminar el usuario'));
    },
  });

  const closeUserModal = () => {
    setUserModalOpen(false);
    setEditingUser(null);
  };

  const openCreateUser = () => {
    if (isSelfRoute && !canCreateMyAgencyUsers) {
      toast.error('No tienes permisos para crear usuarios de tu agencia.');
      return;
    }
    setEditingUser(null);
    setUserModalOpen(true);
  };

  const openEditUser = (selectedUser: User) => {
    if (isSelfRoute && !canUpdateMyAgencyUsers) {
      toast.error('No tienes permisos para editar usuarios de tu agencia.');
      return;
    }
    setEditingUser(selectedUser);
    setUserModalOpen(true);
  };

  const handleDeleteUser = (selectedUser: User) => {
    if (isSelfRoute && !canDeleteMyAgencyUsers) {
      toast.error('No tienes permisos para eliminar usuarios de tu agencia.');
      return;
    }
    if (!selectedUser?.id) return;
    if (selectedUser.id === user?.id) {
      toast.error('No puedes eliminar tu propio usuario.');
      return;
    }

    const confirmed = window.confirm(`¿Eliminar al usuario ${selectedUser.name}?`);
    if (!confirmed) return;

    deleteUserMutation.mutate(selectedUser.id);
  };

  const handleViewUserProfile = (selectedUser: User) => {
    if (!selectedUser?.id) return;

    if (isSelfRoute) {
      navigate(`/my-agency/users/${selectedUser.id}/profile`);
      return;
    }

    navigate(`/agencies/${effectiveAgencyId}/users/${selectedUser.id}/profile`);
  };

  const handleUserSubmit = (values: any) => {
    const payload = {
      name: values.name,
      email: values.email,
      password: values.password || undefined,
      password_confirmation: values.password_confirmation || undefined,
      roles: values.roles,
      status: values.status,
      birthdate: values.birthdate || undefined,
      gender: values.gender || undefined,
    };

    if (editingUser) {
      updateUserMutation.mutate({ userId: editingUser.id, payload });
    } else {
      createUserMutation.mutate(payload);
    }
  };

  const formatStatus = (status: any) => {
    if (status === 'inactive' || status === 0) return { label: 'Inactivo', className: 'badge-ghost' };
    return { label: 'Activo', className: 'badge-success' };
  };

  const countryName = () => {
    if (!agency?.country_id) return '-';
    return countries?.find((c) => c.id === agency.country_id)?.name || `ID ${agency.country_id}`;
  };

  const stateName = () => {
    if (!agency?.state_id) return '-';
    return states?.find((s) => s.id === agency.state_id)?.name || `ID ${agency.state_id}`;
  };

  const cityName = () => {
    if (!agency?.city_id) return '-';
    return cities?.find((c) => c.id === agency.city_id)?.name || `ID ${agency.city_id}`;
  };

  const filteredRoles = useMemo(() => {
    const source = availableRoles || [];
    const agencyRoles = source.filter((role) => role.type === 1);
    return agencyRoles.length > 0 ? agencyRoles : source;
  }, [availableRoles]);

  const agencyLogo = useMemo(
    () => resolveStorageUrl(agency?.logo_path) || agency?.logo_path || null,
    [agency?.logo_path]
  );

  const backPath = isSelfRoute ? '/dashboard' : '/agencies';
  const editPath = isSelfRoute ? '/my-agency/edit' : `/agencies/${agency?.id}/edit`;

  if (isSelfRoute && !canReadMyAgency) {
    return (
      <div className="container mx-auto p-6">
        <div className="alert alert-warning">
          <span>No tienes permisos para ver la información de tu agencia.</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!agency) {
    return (
      <div className="container mx-auto p-6">
        <div className="alert alert-error">
          <span>{(agencyError as any)?.response?.data?.message || 'No se pudo cargar la agencia.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-circle" onClick={() => navigate(backPath)}>
            <BiArrowBack className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BiBuilding className="w-6 h-6 text-primary" />
              {agency.name}
            </h1>
            <p className="text-base-content/60">
              {isSelfRoute ? 'Administra la información de tu agencia y sus usuarios' : 'Detalle de agencia y usuarios vinculados'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {isSelfRoute ? (
            canUpdateMyAgency && (
              <button className="btn btn-primary" onClick={() => navigate(editPath)}>
                <BiEdit className="w-4 h-4" />
                Editar mi agencia
              </button>
            )
          ) : (
            <button className="btn btn-ghost" onClick={() => navigate('/agencies')}>
              <BiEdit className="w-4 h-4" />
              Ver listado
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 card bg-base-100 shadow border border-base-200">
          <div className="card-body">
            <div className="flex justify-between items-center mb-2">
              <h3 className="card-title">Información de la agencia</h3>
              {(canUpdateMyAgency || !isSelfRoute) && (
                <button className="btn btn-ghost btn-sm" onClick={() => navigate(editPath)}>
                  <BiEdit className="w-4 h-4" />
                  Editar
                </button>
              )}
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-base-content/60">Nombre</div>
                  <div className="font-semibold">{agency.name}</div>
                </div>
                <div>
                  <div className="text-sm text-base-content/60">Estado</div>
                  <span className={`badge ${formatStatus(agency.status).className}`}>{formatStatus(agency.status).label}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-base-content/60">NIT</div>
                  <div className="font-semibold">{agency.tax_id || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-base-content/60">Régimen</div>
                  <div className="font-semibold">{agency.tax_regime || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-base-content/60">Correo</div>
                  <div className="font-semibold">{agency.email || '-'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-base-content/60">Teléfono</div>
                  <div className="font-semibold">{agency.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-base-content/60">Dirección</div>
                  <div className="font-semibold">{agency.address || '-'}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-base-content/60">País</div>
                  <div className="font-semibold flex items-center gap-2">
                    <BiGlobe className="w-4 h-4" />
                    {countryName()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-base-content/60">Estado/Depto</div>
                  <div className="font-semibold">{stateName()}</div>
                </div>
                <div>
                  <div className="text-sm text-base-content/60">Ciudad</div>
                  <div className="font-semibold">{cityName()}</div>
                </div>
              </div>

            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body space-y-4">
            <h3 className="card-title">Identidad visual</h3>
            <div className="space-y-3">
              <div className="text-sm text-base-content/60 mb-1">Logo</div>
              <div className="border border-dashed border-base-300 rounded-2xl bg-base-200/40 flex items-center justify-center h-52 p-6">
                {agencyLogo ? (
                  <img src={agencyLogo} alt="Logo" className="max-h-44 object-contain drop-shadow" />
                ) : (
                  <div className="text-base-content/50 text-sm text-center">
                    <div className="mb-1 font-semibold">Sin logo</div>
                    <div className="text-xs">Carga un logo para la marca</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {(canListMyAgencyUsers || !isSelfRoute) ? (
          <AgencyUsersTab
            users={agencyUsers}
            onCreate={openCreateUser}
            onEdit={openEditUser}
            onViewProfile={handleViewUserProfile}
            onDelete={canDeleteMyAgencyUsers ? handleDeleteUser : undefined}
            formatStatus={formatStatus}
            canCreate={canCreateMyAgencyUsers}
            canEdit={canUpdateMyAgencyUsers}
            canViewProfile={canViewAgencyUserProfile}
            canDelete={canDeleteMyAgencyUsers}
          />
        ) : (
          <div className="alert alert-warning">
            <span>No tienes permisos para ver usuarios de tu agencia.</span>
          </div>
        )}
      </div>

      <AgencyUserModal
        isOpen={userModalOpen}
        onClose={closeUserModal}
        onSubmit={handleUserSubmit}
        roles={filteredRoles}
        user={editingUser}
        isSaving={createUserMutation.isPending || updateUserMutation.isPending || deleteUserMutation.isPending}
      />
    </div>
  );
};

export default AgencyDetailPage;
