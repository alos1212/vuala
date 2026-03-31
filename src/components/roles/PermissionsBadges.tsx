import React, { useState } from 'react';
import type { Permission } from '../../types/auth';

interface PermissionsBadgesProps {
    permissions: Permission[];
    maxShow?: number;
}

const PermissionsBadges: React.FC<PermissionsBadgesProps> = ({
    permissions,
    maxShow = 5
}) => {
    const [showAll, setShowAll] = useState(false);

    const groupedByModule = permissions.reduce((acc, permission) => {
        if (!acc[permission.group]) {
            acc[permission.group] = [];
        }
        acc[permission.group].push(permission);
        return acc;
    }, {} as Record<string, Permission[]>);

    const displayedModules = Object.entries(groupedByModule);
    const visibleModules = showAll ? displayedModules : displayedModules.slice(0, maxShow);
    const hasMore = displayedModules.length > maxShow;

    return (
        <div className="space-y-2">
            {visibleModules.map(([module, modulePermissions]) => (
                <div key={module} className="flex flex-wrap gap-1">
                    <div className="badge badge-outline badge-sm font-semibold">
                        {module.replace('_', ' ')}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {modulePermissions.map((permission) => (
                            <div
                                key={permission.id}
                                className="badge badge-primary badge-xs"
                                title={permission.description || permission.display_name}
                            >
                                {permission.display_name}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {hasMore && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="btn btn-ghost btn-xs"
                >
                    {showAll ? 'Ver menos' : `Ver ${displayedModules.length - maxShow} más...`}
                </button>
            )}
        </div>
    );
};

export default PermissionsBadges;