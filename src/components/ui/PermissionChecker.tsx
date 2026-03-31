import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { BiCheck, BiX, BiShield } from 'react-icons/bi';

interface PermissionCheckerProps {
  permissions: string[];
  showIcons?: boolean;
  className?: string;
}

const PermissionChecker: React.FC<PermissionCheckerProps> = ({ 
  permissions, 
  showIcons = true,
  className = ''
}) => {
  const { hasPermission } = useAuthStore();

  return (
    <div className={`space-y-2 ${className}`}>
      <h4 className="font-semibold flex items-center">
        <BiShield className="w-4 h-4 mr-1" />
        Verificación de Permisos
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {permissions.map((permission) => {
          const hasAccess = hasPermission(permission);
          return (
            <div
              key={permission}
              className={`flex items-center space-x-2 p-2 rounded text-sm ${
                hasAccess 
                  ? 'bg-success/10 text-success-content border border-success/30' 
                  : 'bg-error/10 text-error-content border border-error/30'
              }`}
            >
              {showIcons && (
                hasAccess ? (
                  <BiCheck className="w-4 h-4 text-success" />
                ) : (
                  <BiX className="w-4 h-4 text-error" />
                )
              )}
              <code className="text-xs">{permission}</code>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PermissionChecker;