import React from 'react';
import { useAuthStore } from '../../stores/authStore';

interface RoleGuardProps {
    role: string;
    children: React.ReactNode;
    fallback?: React.ReactNode;
    showFallback?: boolean;
}

const RoleGuard: React.FC<RoleGuardProps> = ({
    role,
    children,
    fallback = null,
    showFallback = false
}) => {
    const { hasRole } = useAuthStore();

    if (!hasRole(role)) {
        return showFallback ? <>{fallback}</> : null;
    }

    return <>{children}</>;
};

export default RoleGuard;