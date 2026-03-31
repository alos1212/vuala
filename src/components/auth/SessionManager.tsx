import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { toast } from 'react-hot-toast';

interface SessionManagerProps {
  children: React.ReactNode;
  warningTime?: number; // minutos antes de expirar para mostrar advertencia
  sessionDuration?: number; // duración de sesión en minutos
}

const SessionManager: React.FC<SessionManagerProps> = ({
  children,
  warningTime = 5,
  sessionDuration = 60,
}) => {
  const { isAuthenticated, logout } = useAuthStore();
  const warningShownRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Limpiar timeout anterior
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Configurar advertencia de sesión
    const warningTimeout = setTimeout(() => {
      if (!warningShownRef.current) {
        warningShownRef.current = true;
        toast((t) => (
          <div className="flex items-center space-x-3">
            <div>
              <p className="font-semibold">Sesión por expirar</p>
              <p className="text-sm">Tu sesión expirará en {warningTime} minutos</p>
            </div>
            <button
              className="btn btn-sm btn-primary"
              onClick={() => {
                toast.dismiss(t.id);
                warningShownRef.current = false;
                // Aquí puedes agregar lógica para renovar la sesión
              }}
            >
              Renovar
            </button>
          </div>
        ), {
          duration: warningTime * 60 * 1000, // duración en ms
        });
      }
    }, (sessionDuration - warningTime) * 60 * 1000);

    // Configurar logout automático
    const logoutTimeout = setTimeout(() => {
      logout();
      toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
    }, sessionDuration * 60 * 1000);

    timeoutRef.current = logoutTimeout;

    return () => {
      clearTimeout(warningTimeout);
      clearTimeout(logoutTimeout);
    };
  }, [isAuthenticated, logout, warningTime, sessionDuration]);

  // Reset warning when user interacts
  useEffect(() => {
    const resetWarning = () => {
      warningShownRef.current = false;
    };

    window.addEventListener('click', resetWarning);
    window.addEventListener('keypress', resetWarning);
    window.addEventListener('scroll', resetWarning);

    return () => {
      window.removeEventListener('click', resetWarning);
      window.removeEventListener('keypress', resetWarning);
      window.removeEventListener('scroll', resetWarning);
    };
  }, []);

  return <>{children}</>;
};

export default SessionManager;