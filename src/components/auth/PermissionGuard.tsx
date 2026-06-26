import React from 'react';
import { useAuthStore } from '../../stores/authStore';

interface PermissionGuardProps {
    permission: string;
    permissionAny?: string[];
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showFallback?: boolean;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
    permission,
    permissionAny,
    children,
    fallback = null,
    showFallback = false
}) => {
    const { hasPermission } = useAuthStore();

    const hasPrimaryPermission = permission ? hasPermission(permission) : false;
    const hasAnyPermission = Array.isArray(permissionAny) && permissionAny.length > 0
        ? permissionAny.some((entry) => hasPermission(entry))
        : false;

    if (!hasPrimaryPermission && !hasAnyPermission) {
        return showFallback ? <>{fallback}</> : null;
    }

    return <>{children}</>;
};

export default PermissionGuard;
