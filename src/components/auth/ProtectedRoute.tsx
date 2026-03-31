import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { BiLock, BiShield } from 'react-icons/bi';

interface ProtectedRouteProps {
    children: React.ReactNode;
    permission?: string;
    permissionAny?: string[];
    role?: string;
    fallback?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
    children,
    permission,
    permissionAny,
    role,
    fallback
}) => {
    const { isAuthenticated, hasPermission, hasRole } = useAuthStore();

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-base-200">
                <div className="card w-96 bg-base-100 shadow-xl">
                    <div className="card-body text-center">
                        <BiLock className="w-16 h-16 mx-auto text-error mb-4" />
                        <h2 className="card-title justify-center">Acceso Denegado</h2>
                        <p className="text-base-content/60">
                            Debes iniciar sesión para acceder a esta página
                        </p>
                        <div className="card-actions justify-center mt-4">
                            <button
                                className="btn btn-primary"
                                onClick={() => window.location.href = '/login'}
                            >
                                Ir al Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (permission && !hasPermission(permission)) {
        return fallback || (
            <div className="min-h-screen flex items-center justify-center bg-base-200">
                <div className="card w-96 bg-base-100 shadow-xl">
                    <div className="card-body text-center">
                        <BiShield className="w-16 h-16 mx-auto text-warning mb-4" />
                        <h2 className="card-title justify-center">Sin Permisos</h2>
                        <p className="text-base-content/60">
                            No tienes permisos suficientes para acceder a esta página
                        </p>
                        <div className="text-sm text-base-content/50 mt-2">
                            Permiso requerido: <code>{permission}</code>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (permissionAny && permissionAny.length > 0 && !permissionAny.some((perm) => hasPermission(perm))) {
        return fallback || (
            <div className="min-h-screen flex items-center justify-center bg-base-200">
                <div className="card w-96 bg-base-100 shadow-xl">
                    <div className="card-body text-center">
                        <BiShield className="w-16 h-16 mx-auto text-warning mb-4" />
                        <h2 className="card-title justify-center">Sin Permisos</h2>
                        <p className="text-base-content/60">
                            No tienes permisos suficientes para acceder a esta página
                        </p>
                        <div className="text-sm text-base-content/50 mt-2">
                            Permiso requerido: <code>{permissionAny.join(" | ")}</code>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (role && !hasRole(role)) {
        return fallback || (
            <div className="min-h-screen flex items-center justify-center bg-base-200">
                <div className="card w-96 bg-base-100 shadow-xl">
                    <div className="card-body text-center">
                        <BiShield className="w-16 h-16 mx-auto text-warning mb-4" />
                        <h2 className="card-title justify-center">Rol Insuficiente</h2>
                        <p className="text-base-content/60">
                            Tu rol no tiene acceso a esta página
                        </p>
                        <div className="text-sm text-base-content/50 mt-2">
                            Rol requerido: <code>{role}</code>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default ProtectedRoute;
