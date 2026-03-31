import React from 'react';
import { BiUser, BiUserCircle, BiEdit, BiTrash } from 'react-icons/bi';
import type { User } from '../../types/auth';

interface Props {
  users?: User[];
  onCreate: () => void;
  onEdit: (user: User) => void;
  onViewProfile?: (user: User) => void;
  onDelete?: (user: User) => void;
  formatStatus: (status: any) => { label: string; className: string };
  canCreate?: boolean;
  canEdit?: boolean;
  canViewProfile?: boolean;
  canDelete?: boolean;
}

const AgencyUsersTab: React.FC<Props> = ({
  users,
  onCreate,
  onEdit,
  onViewProfile,
  onDelete,
  formatStatus,
  canCreate = true,
  canEdit = true,
  canViewProfile = false,
  canDelete = true,
}) => {
  return (
    <div className="card bg-base-100 shadow border border-base-200">
      <div className="card-body">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h3 className="card-title flex items-center gap-2">
            <BiUserCircle className="w-5 h-5" />
            Usuarios de la agencia ({users?.length ?? 0})
          </h3>
          {canCreate && (
            <button className="btn btn-primary btn-sm" onClick={onCreate}>
              <BiUser className="w-4 h-4" />
              Crear usuario
            </button>
          )}
        </div>
        {users && users.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th></th>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th className="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const statusBadge = formatStatus(user.status);
                  const firstRole = Array.isArray(user.role) ? user.role[0] : user.role;
                  const avatar = user.avatar || user.avatar_url;
                  return (
                    <tr key={user.id}>
                      <td>
                        {avatar ? (
                          <div className="avatar">
                            <div className="w-10 h-10 rounded-full border border-base-200 overflow-hidden flex items-center justify-center">
                              <img src={avatar} alt={user.name} />
                            </div>
                          </div>
                        ) : (
                          <div className="avatar placeholder">
                            <div className="w-10 h-10 rounded-full bg-base-200 text-base-content/60 flex items-center justify-center">
                              <span className="text-lg">
                                <BiUser />
                              </span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>{firstRole?.display_name || '-'}</td>
                      <td>
                        <span className={`badge ${statusBadge.className}`}>{statusBadge.label}</span>
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          {canViewProfile && onViewProfile && (
                            <button className="btn btn-ghost btn-sm" onClick={() => onViewProfile(user)}>
                              <BiUserCircle className="w-4 h-4" />
                              Perfil
                            </button>
                          )}
                          {canEdit && (
                            <button className="btn btn-ghost btn-sm" onClick={() => onEdit(user)}>
                              <BiEdit className="w-4 h-4" />
                              Editar
                            </button>
                          )}
                          {canDelete && onDelete && (
                            <button className="btn btn-ghost btn-sm text-error" onClick={() => onDelete(user)}>
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
        ) : (
          <div className="text-center py-10 text-base-content/60">Aún no hay usuarios para esta agencia.</div>
        )}
      </div>
    </div>
  );
};

export default AgencyUsersTab;
