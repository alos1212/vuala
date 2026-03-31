import React, { useState } from 'react';
import { BiCheck, BiChevronDown, BiChevronUp } from 'react-icons/bi';
import type { Permission } from '../../types/auth';

interface PermissionsSelectorProps {
    permissions: Permission[];
    selectedPermissions: number[];
    onPermissionsChange: (selected: number[]) => void;
}

const PermissionsSelector: React.FC<PermissionsSelectorProps> = ({
    permissions,
    selectedPermissions,
    onPermissionsChange,
}) => {
    const [expandedModules, setExpandedModules] = useState<string[]>([]);

    // Agrupar permisos por módulo
    const groupedPermissions = permissions.reduce((acc, permission) => {
        if (!acc[permission.group]) {
            acc[permission.group] = [];
        }
        acc[permission.group].push(permission);
        return acc;
    }, {} as Record<string, Permission[]>);

    const toggleModule = (module: string) => {
        setExpandedModules(prev =>
            prev.includes(module)
                ? prev.filter(m => m !== module)
                : [...prev, module]
        );
    };

    const isModuleExpanded = (module: string) => expandedModules.includes(module);

    const getModuleSelectedCount = (modulePermissions: Permission[]) => {
        return modulePermissions.filter(p => selectedPermissions.includes(p.id)).length;
    };

    const togglePermission = (permissionId: number) => {
        const newSelected = selectedPermissions.includes(permissionId)
            ? selectedPermissions.filter(id => id !== permissionId)
            : [...selectedPermissions, permissionId];

        onPermissionsChange(newSelected);
    };

    const toggleAllModulePermissions = (modulePermissions: Permission[]) => {
        const moduleIds = modulePermissions.map(p => p.id);
        const allSelected = moduleIds.every(id => selectedPermissions.includes(id));

        if (allSelected) {
            // Deseleccionar todos los permisos del módulo
            const newSelected = selectedPermissions.filter(id => !moduleIds.includes(id));
            onPermissionsChange(newSelected);
        } else {
            // Seleccionar todos los permisos del módulo
            const newSelected = [...selectedPermissions];
            moduleIds.forEach(id => {
                if (!newSelected.includes(id)) {
                    newSelected.push(id);
                }
            });
            onPermissionsChange(newSelected);
        }
    };

    return (
        <div className="border border-base-300 rounded-lg">
            {Object.entries(groupedPermissions).map(([module, modulePermissions]) => {
                const selectedCount = getModuleSelectedCount(modulePermissions);
                const totalCount = modulePermissions.length;
                const allSelected = selectedCount === totalCount;
                const someSelected = selectedCount > 0 && selectedCount < totalCount;

                return (
                    <div key={module} className="border-b border-base-300 last:border-b-0">
                        {/* Header del módulo */}
                        <div className="p-4 bg-base-200 flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <button
                                    type="button"
                                    onClick={() => toggleAllModulePermissions(modulePermissions)}
                                    className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-colors ${allSelected
                                            ? 'bg-primary border-primary text-primary-content'
                                            : someSelected
                                                ? 'bg-primary/50 border-primary text-primary-content'
                                                : 'border-base-content/30 hover:border-primary'
                                        }`}
                                >
                                    {(allSelected || someSelected) && (
                                        <BiCheck className="w-3 h-3" />
                                    )}
                                </button>
                                <div>
                                    <h4 className="font-semibold capitalize">
                                        {module.replace('_', ' ')}
                                    </h4>
                                    <p className="text-sm text-base-content/60">
                                        {selectedCount}/{totalCount} seleccionados
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => toggleModule(module)}
                                className="btn btn-ghost btn-sm btn-circle"
                            >
                                {isModuleExpanded(module) ? (
                                    <BiChevronUp className="w-4 h-4" />
                                ) : (
                                    <BiChevronDown className="w-4 h-4" />
                                )}
                            </button>
                        </div>

                        {/* Permisos del módulo */}
                        {isModuleExpanded(module) && (
                            <div className="p-4 space-y-3">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {modulePermissions.map((permission) => (
                                        <label
                                            key={permission.id}
                                            className="flex items-start space-x-3 cursor-pointer hover:bg-base-100 p-2 rounded transition-colors"
                                        >
                                            <button
                                                type="button"
                                                onClick={() => togglePermission(permission.id)}
                                                className={`w-4 h-4 mt-0.5 border-2 rounded flex items-center justify-center transition-colors ${selectedPermissions.includes(permission.id)
                                                        ? 'bg-primary border-primary text-primary-content'
                                                        : 'border-base-content/30 hover:border-primary'
                                                    }`}
                                            >
                                                {selectedPermissions.includes(permission.id) && (
                                                    <BiCheck className="w-3 h-3" />
                                                )}
                                            </button>
                                            <div className="flex-1">
                                                <div className="font-medium text-sm">
                                                    {permission.display_name}
                                                </div>
                                                {permission.description && (
                                                    <div className="text-xs text-base-content/60">
                                                        {permission.description}
                                                    </div>
                                                )}
                                                <div className="text-xs font-mono text-base-content/50">
                                                    {permission.name}
                                                </div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default PermissionsSelector;