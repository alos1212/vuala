import React, { useState } from 'react';
import {
    BiShield,
    BiSearch,
    BiFilter,
    BiCode,
    BiGroup
} from 'react-icons/bi';
import { useRoles } from '../../hooks/useRoles';
import type { Permission } from '../../types/auth';
import SearchableSelect from '../ui/SearchableSelect';

const PermissionsPage: React.FC = () => {
    const { permissions, isLoading } = useRoles();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<string>('all');

    // Agrupar permisos por módulo
    const groupedPermissions = permissions.reduce((acc, permission) => {
        if (!acc[permission.group]) {
            acc[permission.group] = [];
        }
        acc[permission.group].push(permission);
        return acc;
    }, {} as Record<string, Permission[]>);

    // Obtener módulos únicos
    const modules = Object.keys(groupedPermissions);

    // Filtrar permisos
    const filteredPermissions = permissions.filter(permission => {
        const matchesSearch =
            permission.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            permission.description?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesModule = selectedGroup === 'all' || permission.group === selectedGroup;

        return matchesSearch && matchesModule;
    });

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
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-base-content">
                    <BiCode className="inline-block mr-2" />
                    Gestión de Permisos
                </h1>
                <p className="text-base-content/60 mt-1">
                    Visualiza todos los permisos disponibles en el sistema
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="form-control flex-1">
                    <div className="input-group">
                        <span>
                            <BiSearch className="w-5 h-5" />
                        </span>
                        <input
                            type="text"
                            placeholder="Buscar permisos..."
                            className="input input-bordered w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="form-control">
                    <div className="input-group">
                        <span>
                            <BiFilter className="w-5 h-5" />
                        </span>
                        <div className="min-w-[240px]">
                            <SearchableSelect
                                options={[
                                    { value: 'all', label: 'Todos los módulos' },
                                    ...modules.map((module) => ({
                                        value: module,
                                        label: module.replace('_', ' ').toUpperCase(),
                                    })),
                                ]}
                                value={selectedGroup}
                                onChange={(value) => setSelectedGroup(String(value ?? 'all'))}
                                placeholder="Filtrar módulo"
                                isClearable={false}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="stats stats-horizontal shadow mb-6 w-full">
                <div className="stat">
                    <div className="stat-figure text-primary">
                        <BiShield className="w-8 h-8" />
                    </div>
                    <div className="stat-title">Total Permisos</div>
                    <div className="stat-value text-primary">{permissions.length}</div>
                    <div className="stat-desc">Permisos registrados</div>
                </div>

                <div className="stat">
                    <div className="stat-figure text-secondary">
                        <BiGroup className="w-8 h-8" />
                    </div>
                    <div className="stat-title">Módulos</div>
                    <div className="stat-value text-secondary">{modules.length}</div>
                    <div className="stat-desc">Módulos del sistema</div>
                </div>

                <div className="stat">
                    <div className="stat-figure text-accent">
                        <BiSearch className="w-8 h-8" />
                    </div>
                    <div className="stat-title">Filtrados</div>
                    <div className="stat-value text-accent">{filteredPermissions.length}</div>
                    <div className="stat-desc">Permisos mostrados</div>
                </div>
            </div>

            {/* Permissions Table */}
            <div className="card bg-base-100 shadow-lg">
                <div className="card-body">
                    <div className="overflow-x-auto">
                        <table className="table table-zebra w-full">
                            <thead>
                                <tr>
                                    <th>Permiso</th>
                                    <th>Nombre Técnico</th>
                                    <th>Módulo</th>
                                    <th>Descripción</th>
                                    <th>Fecha Creación</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPermissions.map((permission) => (
                                    <tr key={permission.id}>
                                        <td>
                                            <div className="flex items-center space-x-2">
                                                <BiShield className="w-4 h-4 text-primary" />
                                                <span className="font-semibold">
                                                    {permission.display_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td>
                                            <code className="text-sm bg-base-200 px-2 py-1 rounded">
                                                {permission.name}
                                            </code>
                                        </td>
                                        <td>
                                            <div className="badge badge-outline">
                                                {permission?.group ? permission.group.replace('_', ' ') : 'Sin módulo'}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="max-w-xs">
                                                {permission.description || (
                                                    <span className="text-base-content/50 italic">
                                                        Sin descripción
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="text-sm text-base-content/60">
                                            {new Date(permission.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredPermissions.length === 0 && (
                        <div className="text-center py-12">
                            <BiShield className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
                            <h3 className="text-lg font-semibold text-base-content/60">
                                No se encontraron permisos
                            </h3>
                            <p className="text-base-content/50">
                                Intenta ajustar los filtros de búsqueda
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Permissions by Module */}
            <div className="mt-8">
                <h2 className="text-2xl font-bold mb-4">Permisos por Módulo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
                        <div key={module} className="card bg-base-100 shadow border border-base-300">
                            <div className="card-body">
                                <h3 className="card-title text-lg">
                                    <BiGroup className="w-5 h-5 text-primary" />
                                    {module.replace('_', ' ').toUpperCase()}
                                </h3>
                                <div className="space-y-2">
                                    {modulePermissions.map((permission) => (
                                        <div
                                            key={permission.id}
                                            className="flex items-center justify-between p-2 bg-base-200 rounded"
                                        >
                                            <span className="text-sm font-medium">
                                                {permission.display_name}
                                            </span>
                                            <code className="text-xs bg-base-300 px-1 rounded">
                                                {permission.name.split('.').pop()}
                                            </code>
                                        </div>
                                    ))}
                                </div>
                                <div className="card-actions justify-end mt-4">
                                    <div className="badge badge-primary">
                                        {modulePermissions.length} permisos
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PermissionsPage;
