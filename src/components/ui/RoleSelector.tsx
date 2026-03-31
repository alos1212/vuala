import React from 'react';
import type { Role } from '../../types/auth';
import { BiGroup, BiCheck } from 'react-icons/bi';

interface RoleSelectorProps {
    roles: Role[];
    selectedRoles: number[];
    onRolesChange: (roleIds: number[]) => void;
    multiple?: boolean;
    disabled?: boolean;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({
    roles,
    selectedRoles,
    onRolesChange,
    multiple = true,
    disabled = false
}) => {
    const handleRoleToggle = (roleId: number) => {
        if (disabled) return;

        if (multiple) {
            const newSelection = selectedRoles.includes(roleId)
                ? selectedRoles.filter(id => id !== roleId)
                : [...selectedRoles, roleId];
            onRolesChange(newSelection);
        } else {
            onRolesChange(selectedRoles.includes(roleId) ? [] : [roleId]);
        }
    };

    return (
        <div className="space-y-3">
            <h4 className="font-semibold flex items-center">
                <BiGroup className="w-4 h-4 mr-1" />
                Seleccionar Roles {multiple && `(${selectedRoles.length} seleccionados)`}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {roles.map((role) => {
                    const isSelected = selectedRoles.includes(role.id);
                    return (
                        <label
                            key={role.id}
                            className={`
                flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-base-200'}
                ${isSelected ? 'border-primary bg-primary/5' : 'border-base-300'}
              `}
                        >
                            <div
                                className={`
                  w-5 h-5 border-2 rounded flex items-center justify-center transition-colors
                  ${isSelected
                                        ? 'border-primary bg-primary text-primary-content'
                                        : 'border-base-content/30'
                                    }
                `}
                            >
                                {isSelected && <BiCheck className="w-3 h-3" />}
                            </div>

                            <div className="flex-1">
                                <div className="font-semibold">{role.display_name}</div>
                                {role.description && (
                                    <div className="text-sm text-base-content/60">
                                        {role.description}
                                    </div>
                                )}
                                <div className="text-xs text-base-content/50">
                                    {role.permissions.length} permisos
                                </div>
                            </div>

                            <input
                                type={multiple ? 'checkbox' : 'radio'}
                                className="hidden"
                                checked={isSelected}
                                onChange={() => handleRoleToggle(role.id)}
                                disabled={disabled}
                            />
                        </label>
                    );
                })}
            </div>

            {roles.length === 0 && (
                <div className="text-center py-8 text-base-content/60">
                    <BiGroup className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay roles disponibles</p>
                </div>
            )}
        </div>
    );
};

export default RoleSelector;