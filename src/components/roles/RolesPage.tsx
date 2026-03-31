import React, { useState } from 'react';
import { 
  BiPlus, 
  BiEdit, 
  BiTrash, 
  BiSearch,
  BiShield,
  BiUser,
  BiCog
} from 'react-icons/bi';
import { useRoles } from '../../hooks/useRoles';
import { useAuthStore } from '../../stores/authStore';
import type { Role } from '../../types/auth';
import RoleModal from './RoleModal';
import PermissionsBadges from './PermissionsBadges';

const RolesPage: React.FC = () => {
  const { roles, permissions, isLoading, deleteRole } = useRoles();
  const { hasPermission } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const getTypeConfig = (type: Role['type']) => {
    switch (type) {
      case 0:
        return { label: 'Administrativo', className: 'badge-primary' };
      case 1:
        return { label: 'Agencia', className: 'badge-secondary' };
      case 2:
        return { label: 'Comercial', className: 'badge-accent' };
      default:
        return { label: 'Desconocido', className: 'badge-ghost' };
    }
  };

  const filteredRoles = roles.filter(role =>
    role.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    role.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (role: Role) => {
    setSelectedRole(role);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedRole(null);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    deleteRole(id);
    setDeleteConfirmId(null);
  };

  /*const groupPermissionsByModule = (permissions: Permission[]) => {
    return permissions.reduce((acc, permission) => {
      if (!acc[permission.group]) {
        acc[permission.group] = [];
      }
      acc[permission.group].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  };*/

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-base-content">
            <BiShield className="inline-block mr-2" />
            Gestión de Roles
          </h1>
          <p className="text-base-content/60 mt-1">
            Administra los roles y permisos del sistema
          </p>
        </div>
        {hasPermission('roles.create') && (
          <button 
            className="btn btn-primary"
            onClick={handleCreate}
          >
            <BiPlus className="w-5 h-5" />
            Crear Rol
          </button>
        )}
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="form-control w-full max-w-sm">
          <div className="input-group">
            <span>
              <BiSearch className="w-5 h-5" />
            </span>
            <input
              type="text"
              placeholder="Buscar roles..."
              className="input input-bordered w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRoles.map((role) => (
          <div key={role.id} className="card bg-base-100 shadow-lg border border-base-300">
            <div className="card-body">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="card-title text-lg">
                    <BiShield className="w-5 h-5 text-primary" />
                    {role.display_name}
                  </h2>
                  <p className="text-sm text-base-content/60 font-mono">
                    {role.name}
                  </p>
                  <div className="mt-2">
                    {(() => {
                      const { label, className } = getTypeConfig(role.type);
                      return <span className={`badge ${className}`}>{label}</span>;
                    })()}
                  </div>
                </div>
                <div className="dropdown dropdown-end">
                  <button className="btn btn-ghost btn-sm btn-circle">
                    <BiCog className="w-4 h-4" />
                  </button>
                  <ul className="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-52">
                    {hasPermission('roles.update') && (
                      <li>
                        <button onClick={() => handleEdit(role)}>
                          <BiEdit className="w-4 h-4" />
                          Editar
                        </button>
                      </li>
                    )}
                    {hasPermission('roles.delete') && (
                      <li>
                        <button 
                          onClick={() => setDeleteConfirmId(role.id)}
                          className="text-error"
                        >
                          <BiTrash className="w-4 h-4" />
                          Eliminar
                        </button>
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {role.description && (
                <p className="text-sm text-base-content/70 mb-4">
                  {role.description}
                </p>
              )}

              {/* Permisos agrupados */}
              <div className="space-y-3">
                <div className="flex items-center text-sm font-semibold text-base-content/80">
                  <BiUser className="w-4 h-4 mr-1" />
                  Permisos ({role.permissions.length})
                </div>
                
                <PermissionsBadges 
                  permissions={role.permissions}
                  maxShow={6}
                />
              </div>

              <div className="card-actions justify-end mt-4">
                <div className="text-xs text-base-content/60">
                  Creado: {new Date(role.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRoles.length === 0 && (
        <div className="text-center py-12">
          <BiShield className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
          <h3 className="text-lg font-semibold text-base-content/60">
            No se encontraron roles
          </h3>
          <p className="text-base-content/50">
            {searchTerm ? 'Intenta con otros términos de búsqueda' : 'Crea tu primer rol'}
          </p>
        </div>
      )}

      {/* Modal */}
      <RoleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        role={selectedRole}
        permissions={permissions}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg">Confirmar Eliminación</h3>
            <p className="py-4">
              ¿Estás seguro de que deseas eliminar este rol? Esta acción no se puede deshacer.
            </p>
            <div className="modal-action">
              <button 
                className="btn btn-ghost"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-error"
                onClick={() => handleDelete(deleteConfirmId)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesPage;
