import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BiBuilding, BiEnvelope, BiHide, BiMap, BiPhone, BiShow, BiUser, BiUserPlus, BiPencil } from 'react-icons/bi';
import { companyService } from '../../services/companyService';
import { clientService } from '../../services/clientService';
import { roleService } from '../../services/roleService';
import { geoService } from '../../services/geoService';
import { getCompanyLogo } from '../../utils/authHelpers';
import SearchableSelect from '../../components/ui/SearchableSelect';

const getUserRoleId = (user: any): number | null => {
  if (Array.isArray(user?.role) && user.role.length > 0) {
    const roleId = Number(user.role[0]?.id);
    return Number.isFinite(roleId) ? roleId : null;
  }

  if (user?.role && typeof user.role === 'object') {
    const roleId = Number(user.role.id);
    return Number.isFinite(roleId) ? roleId : null;
  }

  const fallbackRoleId = Number(user?.role_id);
  return Number.isFinite(fallbackRoleId) ? fallbackRoleId : null;
};

const CompanyDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [newUser, setNewUser] = React.useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role_id: '',
  });
  const [editingUserId, setEditingUserId] = React.useState<number | null>(null);
  const [editUser, setEditUser] = React.useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role_id: '',
  });
  const [showCreatePassword, setShowCreatePassword] = React.useState(false);
  const [showEditPassword, setShowEditPassword] = React.useState(false);
  const { id } = useParams<{ id: string }>();
  const companyId = Number(id);

  const { data: company, isLoading } = useQuery({
    queryKey: ['company', companyId],
    queryFn: () => companyService.getCompany(companyId),
    enabled: Number.isFinite(companyId),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['company-users', companyId],
    queryFn: () => companyService.getCompanyUsers(companyId),
    enabled: Number.isFinite(companyId),
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['company-user-roles'],
    queryFn: roleService.getAvailableRoles,
  });

  const { data: clientsData } = useQuery({
    queryKey: ['company-clients', companyId],
    queryFn: () => clientService.getClients({ company_id: companyId, per_page: 20 }),
    enabled: Number.isFinite(companyId),
  });

  const clients = clientsData?.data ?? [];
  const companyRoles = roles.filter((role) => role.type === 1);
  const companyCountryId = Number(company?.country_id) || undefined;
  const companyStateId = Number(company?.state_id) || undefined;
  const companyCityId = Number(company?.city_id) || undefined;

  const { data: countries = [] } = useQuery({
    queryKey: ['geo-countries'],
    queryFn: geoService.getCountries,
  });

  const { data: states = [] } = useQuery({
    queryKey: ['geo-states', companyCountryId],
    queryFn: () => geoService.getStatesByCountry(companyCountryId as number),
    enabled: Boolean(companyCountryId),
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['geo-cities', companyStateId],
    queryFn: () => geoService.getCitiesByState(companyStateId as number),
    enabled: Boolean(companyStateId),
  });

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim() || !newUser.role_id) return;
    await companyService.createCompanyUser(company.id, {
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
      password_confirmation: newUser.password_confirmation || newUser.password,
      roles: [Number(newUser.role_id)],
      status: 'active',
    });
    queryClient.invalidateQueries({ queryKey: ['company-users', companyId] });
    setNewUser({
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
      role_id: '',
    });
    setShowCreatePassword(false);
  };

  const handleStartEditUser = (user: (typeof users)[number]) => {
    const roleId = getUserRoleId(user);

    setEditingUserId(user.id);
    setEditUser({
      name: user.name ?? '',
      email: user.email ?? '',
      password: '',
      password_confirmation: '',
      role_id: roleId ? String(roleId) : '',
    });
    setShowEditPassword(false);
  };

  const handleCancelEditUser = () => {
    setEditingUserId(null);
    setEditUser({
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
      role_id: '',
    });
    setShowEditPassword(false);
  };

  const handleUpdateUser = async () => {
    if (!editingUserId || !editUser.name.trim() || !editUser.email.trim() || !editUser.role_id) return;
    const currentUser = users.find((user) => user.id === editingUserId);

    const payload: Record<string, unknown> = {
      name: editUser.name,
      email: editUser.email,
      roles: [Number(editUser.role_id)],
      status: currentUser?.status ?? 'active',
    };

    if (editUser.password.trim()) {
      payload.password = editUser.password;
      payload.password_confirmation = editUser.password_confirmation || editUser.password;
    }

    await companyService.updateCompanyUser(company.id, editingUserId, payload);
    queryClient.invalidateQueries({ queryKey: ['company-users', companyId] });
    handleCancelEditUser();
  };

  if (isLoading || !company) {
    return <div className="p-10 text-center"><span className="loading loading-spinner loading-lg" /></div>;
  }

  const companyLogo = getCompanyLogo(company);
  const isActive = company.status !== 0;
  const countryName = countries.find((country) => country.id === companyCountryId)?.name ?? '-';
  const stateName = states.find((state) => state.id === companyStateId)?.name ?? '-';
  const cityName = cities.find((city) => city.id === companyCityId)?.name ?? '-';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <section className="rounded-[32px] border border-base-200 bg-gradient-to-r from-base-100 via-base-100 to-base-200/70 p-6 shadow">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="avatar">
              <div className="w-24 h-24 rounded-[28px] border border-base-300 bg-base-100 shadow-sm">
                {companyLogo ? (
                  <img src={companyLogo} alt={`Logo de ${company.name}`} className="object-contain p-3" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-base-content/40">
                    <BiBuilding className="w-11 h-11" />
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="badge badge-outline mb-3">Perfil de compañía</div>
              <h1 className="text-3xl font-bold">{company.name}</h1>
              <p className="mt-1 text-base-content/60">Detalle de la compañía, sus usuarios internos y sus clientes.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`badge ${isActive ? 'badge-success' : 'badge-ghost'}`}>
                  {isActive ? 'Activa' : 'Inactiva'}
                </span>
                <span className="badge badge-outline">NIT: {company.tax_id || 'Sin registro'}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => navigate('/companies')}>Volver</button>
            <button className="btn btn-primary" onClick={() => navigate(`/companies/${company.id}/edit`)}>Editar</button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <BiUser className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-base-content/60">Usuarios internos</div>
              <div className="text-2xl font-bold">{users.length}</div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-secondary/10 p-3 text-secondary">
              <BiBuilding className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-base-content/60">Clientes visibles</div>
              <div className="text-2xl font-bold">{clients.length}</div>
            </div>
          </div>
        </div>
        <div className="rounded-3xl border border-base-200 bg-base-100 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-accent/10 p-3 text-accent">
              <BiEnvelope className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm text-base-content/60">Correo principal</div>
              <div className="font-semibold truncate">{company.email || 'Sin correo'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Información general</h2>
              <p className="text-sm text-base-content/60">Datos principales e identidad visual de la compañía.</p>
            </div>
            <div className="badge badge-outline">Resumen</div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[190px_1fr]">
            <div className="rounded-3xl border border-base-200 bg-base-50 p-4">
              <div className="text-sm text-base-content/60">Logo</div>
              <div className="mt-4 flex justify-center">
                {companyLogo ? (
                  <div className="w-28 h-28 rounded-2xl border border-base-300 bg-base-100 p-3">
                    <img src={companyLogo} alt={`Logo de ${company.name}`} className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-28 h-28 rounded-2xl border border-dashed border-base-300 bg-base-100 flex items-center justify-center text-base-content/50">
                    <BiBuilding className="w-8 h-8" />
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                <div className="text-sm text-base-content/60">NIT</div>
                <div className="mt-1 font-semibold">{company.tax_id || '-'}</div>
              </div>
              <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                <div className="text-sm text-base-content/60">Estado</div>
                <div className="mt-1 font-semibold">{isActive ? 'Activa' : 'Inactiva'}</div>
              </div>
              <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                <div className="flex items-center gap-2 text-sm text-base-content/60">
                  <BiEnvelope className="h-4 w-4" />
                  Correo
                </div>
                <div className="mt-1 font-semibold break-all">{company.email || '-'}</div>
              </div>
              <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                <div className="flex items-center gap-2 text-sm text-base-content/60">
                  <BiPhone className="h-4 w-4" />
                  Teléfono
                </div>
                <div className="mt-1 font-semibold">{company.phone || '-'}</div>
              </div>
              <div className="rounded-2xl border border-base-200 bg-base-50 p-4 md:col-span-2">
                <div className="flex items-center gap-2 text-sm text-base-content/60">
                  <BiMap className="h-4 w-4" />
                  Dirección
                </div>
                <div className="mt-1 font-semibold">{company.address || '-'}</div>
              </div>
              <div className="md:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                  <div className="text-sm text-base-content/60">País</div>
                  <div className="mt-1 font-semibold">{countryName}</div>
                </div>
                <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                  <div className="text-sm text-base-content/60">Estado</div>
                  <div className="mt-1 font-semibold">{stateName}</div>
                </div>
                <div className="rounded-2xl border border-base-200 bg-base-50 p-4">
                  <div className="text-sm text-base-content/60">Ciudad</div>
                  <div className="mt-1 font-semibold">{cityName}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Usuarios internos</h2>
              <p className="text-sm text-base-content/60">Invita y administra el equipo de esta compañía.</p>
            </div>
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <BiUserPlus className="h-5 w-5" />
            </div>
          </div>

          <form
            className="rounded-3xl border border-base-200 bg-base-50 p-4 mb-5"
            autoComplete="off"
            onSubmit={(event) => {
              event.preventDefault();
              handleCreateUser();
            }}
          >
            <input type="text" name="fake_username" autoComplete="username" className="hidden" tabIndex={-1} />
            <input type="password" name="fake_password" autoComplete="new-password" className="hidden" tabIndex={-1} />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                className="input input-bordered bg-base-100"
                name="company_user_name"
                autoComplete="off"
                placeholder="Nombre"
                value={newUser.name}
                onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
              />
              <input
                className="input input-bordered bg-base-100"
                name="company_user_email"
                autoComplete="off"
                placeholder="Correo"
                value={newUser.email}
                onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
              />
              <div className="relative">
                <input
                  className="input input-bordered bg-base-100 w-full pr-12"
                  type={showCreatePassword ? 'text' : 'password'}
                  name="company_user_password"
                  autoComplete="new-password"
                  placeholder="Contraseña"
                  value={newUser.password}
                  onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm absolute right-1 top-1"
                  onClick={() => setShowCreatePassword((prev) => !prev)}
                >
                  {showCreatePassword ? <BiHide className="w-5 h-5" /> : <BiShow className="w-5 h-5" />}
                </button>
              </div>
              <SearchableSelect
                options={companyRoles.map((role) => ({ value: role.id, label: role.display_name }))}
                value={newUser.role_id ? Number(newUser.role_id) : null}
                onChange={(value) => setNewUser((prev) => ({ ...prev, role_id: value ? String(value) : '' }))}
                placeholder="Rol interno"
                isClearable
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button className="btn btn-primary" type="submit">Crear usuario</button>
            </div>
          </form>

          {users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-base-300 p-5 text-base-content/60">
              No hay usuarios internos registrados todavía para esta compañía.
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="rounded-2xl border border-base-200 bg-base-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{user.name}</div>
                      <div className="text-sm text-base-content/60">{user.email}</div>
                    </div>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => handleStartEditUser(user)}>
                      <BiPencil className="w-4 h-4" />
                      Editar
                    </button>
                  </div>

                  {editingUserId === user.id && (
                    <form
                      className="mt-4 rounded-2xl border border-base-200 bg-base-100 p-4"
                      autoComplete="off"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleUpdateUser();
                      }}
                    >
                      <input type="text" name="fake_edit_username" autoComplete="username" className="hidden" tabIndex={-1} />
                      <input type="password" name="fake_edit_password" autoComplete="new-password" className="hidden" tabIndex={-1} />
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <input
                          className="input input-bordered bg-base-100"
                          name="company_edit_user_name"
                          autoComplete="off"
                          placeholder="Nombre"
                          value={editUser.name}
                          onChange={(e) => setEditUser((prev) => ({ ...prev, name: e.target.value }))}
                        />
                        <input
                          className="input input-bordered bg-base-100"
                          name="company_edit_user_email"
                          autoComplete="off"
                          placeholder="Correo"
                          value={editUser.email}
                          onChange={(e) => setEditUser((prev) => ({ ...prev, email: e.target.value }))}
                        />
                        <div className="relative">
                          <input
                            className="input input-bordered bg-base-100 w-full pr-12"
                            type={showEditPassword ? 'text' : 'password'}
                            name="company_edit_user_password"
                            autoComplete="new-password"
                            placeholder="Nueva contraseña (opcional)"
                            value={editUser.password}
                            onChange={(e) => setEditUser((prev) => ({ ...prev, password: e.target.value }))}
                          />
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm absolute right-1 top-1"
                            onClick={() => setShowEditPassword((prev) => !prev)}
                          >
                            {showEditPassword ? <BiHide className="w-5 h-5" /> : <BiShow className="w-5 h-5" />}
                          </button>
                        </div>
                        <SearchableSelect
                          options={companyRoles.map((role) => ({ value: role.id, label: role.display_name }))}
                          value={editUser.role_id ? Number(editUser.role_id) : null}
                          onChange={(value) => setEditUser((prev) => ({ ...prev, role_id: value ? String(value) : '' }))}
                          placeholder="Rol interno"
                          isClearable={false}
                        />
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <button className="btn btn-ghost btn-sm" type="button" onClick={handleCancelEditUser}>
                          Cancelar
                        </button>
                        <button className="btn btn-primary btn-sm" type="submit">
                          Guardar cambios
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-3xl border border-base-200 bg-base-100 p-6 shadow">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-semibold">Clientes</h2>
            <p className="text-sm text-base-content/60">Clientes pertenecientes a esta compañía.</p>
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(`/clients/create?company_id=${company.id}`)}>
            Nuevo cliente
          </button>
        </div>

        {clients.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-base-300 p-5 text-base-content/60">
            No hay clientes registrados para esta compañía.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {clients.map((client) => (
              <button
                key={client.id}
                className="rounded-2xl border border-base-200 bg-base-50 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:bg-base-100 hover:shadow-md"
                onClick={() => navigate(`/clients/${client.id}`)}
              >
                <div className="font-semibold">{client.name}</div>
                <div className="text-sm text-base-content/60">{client.email || client.phone || 'Sin contacto principal'}</div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default CompanyDetailPage;
