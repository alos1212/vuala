import React from 'react';
import {
    BiUser,
    BiGroup,
    BiShield,
    BiTrendingUp,
    BiCheckCircle
} from 'react-icons/bi';
import { usePermissionCheck } from '../hooks/usePermissionCheck';
import { useAuth } from '../hooks/useAuth';

import PermissionGuard from '../components/auth/PermissionGuard';
import type { Role } from '../types/auth';

const DashboardPage: React.FC = () => {
    const { user } = useAuth();
 
    const {
        canManageUsers,
        isAdmin
    } = usePermissionCheck();

    const stats = [
        {
            title: 'Usuarios',
            value: '150',
            icon: BiUser,
            color: 'text-primary',
            visible: canManageUsers(),
        },
        
        {
            title: 'Estado',
            value: 'Activo',
            icon: BiCheckCircle,
            color: 'text-success',
            visible: true,
        },
    ];

    return (
        <div className="p-6">
            {/* Welcome Section */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-base-content">
                    ¡Bienvenido, {user?.name}!
                </h1>
                <p className="text-base-content/60 mt-1">
                    Panel de administración del sistema
                </p>
                {isAdmin() && (
                    <div className="alert alert-info mt-4">
                        <BiShield className="w-6 h-6" />
                        <span>Tienes permisos de administrador completo</span>
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats
                    .filter(stat => stat.visible)
                    .map((stat, index) => (
                        <div key={index} className="stat bg-base-100 shadow-lg rounded-lg">
                            <div className="stat-figure">
                                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                            </div>
                            <div className="stat-title">{stat.title}</div>
                            <div className={`stat-value ${stat.color}`}>
                                {stat.value}
                            </div>
                            <div className="stat-desc">
                                <BiTrendingUp className="inline w-4 h-4 mr-1" />
                                Actualizado
                            </div>
                        </div>
                    ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PermissionGuard permission="users.create">
                    <div className="card bg-base-100 shadow-lg">
                        <div className="card-body">
                            <h2 className="card-title">
                                <BiUser className="w-6 h-6 text-primary" />
                                Gestión de Usuarios
                            </h2>
                            <p className="text-base-content/60">
                                Administra usuarios del sistema, asigna roles y permisos
                            </p>
                            <div className="card-actions justify-end">
                                <button className="btn btn-primary">
                                    Gestionar Usuarios
                                </button>
                            </div>
                        </div>
                    </div>
                </PermissionGuard>

                <PermissionGuard permission="roles.create">
                    <div className="card bg-base-100 shadow-lg">
                        <div className="card-body">
                            <h2 className="card-title">
                                <BiGroup className="w-6 h-6 text-secondary" />
                                Gestión de Roles
                            </h2>
                            <p className="text-base-content/60">
                                Crea y administra roles, asigna permisos específicos
                            </p>
                            <div className="card-actions justify-end">
                                <button className="btn btn-secondary">
                                    Gestionar Roles
                                </button>
                            </div>
                        </div>
                    </div>
                </PermissionGuard>
            </div>

            {/* User Info */}
            <div className="mt-8">
                <div className="card bg-base-100 shadow-lg">
                    <div className="card-body">
                        <h2 className="card-title">Tu Información</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <h3 className="font-semibold text-base-content/80">Roles Asignados</h3>
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {(Array.isArray(user?.role) ? user.role : [user?.role])
                                        .filter((role): role is Role => role !== undefined && role !== null)
                                        .map((role) => (
                                            <div key={role.id} className="badge badge-primary">
                                                {role.display_name}
                                            </div>
                                        ))}
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-base-content/80">Permisos Activos</h3>
                                <div className="text-sm text-base-content/60 mt-2">
                                    {(Array.isArray(user?.role) ? user.role : [user?.role])
                                        .filter((role): role is Role => role !== undefined && role !== null)
                                        .reduce((total, role) => total + (role.permissions?.length ?? 0), 0)} permisos
                                </div>
                            </div>
                            <div>
                                <h3 className="font-semibold text-base-content/80">Último Acceso</h3>
                                <div className="text-sm text-base-content/60 mt-2">
                                    Ahora
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
