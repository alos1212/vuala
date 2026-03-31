import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  BiArrowBack, 
  BiEdit, 
  BiTrash, 
  BiUser, 
  BiShield,
  BiCalendar
} from 'react-icons/bi';
import { roleService } from '../../services/roleService';
import { useRoles } from '../../hooks/useRoles';
import PermissionsBadges from '../../components/roles/PermissionsBadges';
import PermissionGuard from '../../components/auth/PermissionGuard';

const RoleDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { deleteRole } = useRoles();
  const getTypeConfig = (type: number) => {
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

  const { data: role, isLoading, error } = useQuery({
    queryKey: ['role', id],
    queryFn: () => roleService.getRole(Number(id)),
    enabled: !!id,
  });

  const handleDelete = () => {
    if (role && window.confirm('¿Estás seguro de eliminar este rol?')) {
      deleteRole(role.id, {
        onSuccess: () => {
          navigate('/roles');
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="container mx-auto p-6">
        <div className="alert alert-error">
          <span>Error al cargar el rol</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/roles')}
            className="btn btn-ghost btn-circle"
          >
            <BiArrowBack className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-base-content">
              {role.display_name}
            </h1>
            <p className="text-base-content/60">
              Detalles del rol del sistema
            </p>
          </div>
        </div>

        <div className="flex space-x-2">
          <PermissionGuard permission="roles.update">
            <button className="btn btn-primary">
              <BiEdit className="w-4 h-4" />
              Editar
            </button>
          </PermissionGuard>
          
          <PermissionGuard permission="roles.delete">
            <button 
              onClick={handleDelete}
              className="btn btn-error"
            >
              <BiTrash className="w-4 h-4" />
              Eliminar
            </button>
          </PermissionGuard>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información Básica */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">
                <BiShield className="w-5 h-5 text-primary" />
                Información del Rol
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Nombre Técnico</span>
                  </label>
                  <code className="bg-base-200 px-3 py-2 rounded block">
                    {role.name}
                  </code>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Nombre para Mostrar</span>
                  </label>
                  <p className="text-lg">{role.display_name}</p>
                </div>

                <div>
                  <label className="label">
                    <span className="label-text font-semibold">Tipo</span>
                  </label>
                  {(() => {
                    const { label, className } = getTypeConfig(role.type);
                    return <div className={`badge badge-lg ${className}`}>{label}</div>;
                  })()}
                </div>

                {role.description && (
                  <div>
                    <label className="label">
                      <span className="label-text font-semibold">Descripción</span>
                    </label>
                    <p className="text-base-content/80">{role.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Permisos */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h2 className="card-title">
                <BiUser className="w-5 h-5 text-secondary" />
                Permisos Asignados ({role.permissions.length})
              </h2>
              
              <PermissionsBadges 
                permissions={role.permissions} 
                maxShow={20} 
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Estadísticas */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-lg">Estadísticas</h3>
              
              <div className="stats stats-vertical w-full">
                <div className="stat">
                  <div className="stat-title">Permisos</div>
                  <div className="stat-value text-primary">
                    {role.permissions.length}
                  </div>
                  <div className="stat-desc">Permisos asignados</div>
                </div>
                
                <div className="stat">
                  <div className="stat-title">Módulos</div>
                  <div className="stat-value text-secondary">
                    {new Set(role.permissions.map(p => p.group)).size}
                  </div>
                  <div className="stat-desc">Módulos con acceso</div>
                </div>
              </div>
            </div>
          </div>

          {/* Información de Fechas */}
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-lg">
                <BiCalendar className="w-5 h-5" />
                Fechas
              </h3>
              
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-base-content/70">
                    Fecha de Creación
                  </div>
                  <div className="text-sm">
                    {new Date(role.created_at).toLocaleString()}
                  </div>
                </div>
                
                <div>
                  <div className="text-sm font-semibold text-base-content/70">
                    Última Actualización
                  </div>
                  <div className="text-sm">
                    {new Date(role.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleDetailsPage;
