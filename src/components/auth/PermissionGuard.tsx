import React from 'react';
import { useAuthStore } from '../../stores/authStore';

interface PermissionGuardProps {
    permission: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showFallback?: boolean;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({
    permission,
    children,
    fallback = null,
    showFallback = false
}) => {
    const { hasPermission } = useAuthStore();

    if (!hasPermission(permission)) {
        return showFallback ? <>{fallback}</> : null;
    }

    return <>{children}</>;
};

export default PermissionGuard;