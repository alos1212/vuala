import { useAuthStore } from '../stores/authStore';
import { PERMISSIONS } from '../utils/permissions';

export const usePermissionCheck = () => {
  const { hasPermission, hasRole } = useAuthStore();

  return {
    // Verificaciones de permisos específicos
    canManageUsers: () => hasPermission(PERMISSIONS.USERS_LIST),
    canCreateUsers: () => hasPermission(PERMISSIONS.USERS_CREATE),
    canEditUsers: () => hasPermission(PERMISSIONS.USERS_UPDATE),
    canDeleteUsers: () => hasPermission(PERMISSIONS.USERS_DELETE),
    
    canManageRoles: () => hasPermission(PERMISSIONS.ROLES_LIST),
    canCreateRoles: () => hasPermission(PERMISSIONS.ROLES_CREATE),
    canEditRoles: () => hasPermission(PERMISSIONS.ROLES_UPDATE),
    canDeleteRoles: () => hasPermission(PERMISSIONS.ROLES_DELETE),
    
    canViewPermissions: () => hasPermission(PERMISSIONS.PERMISSIONS_LIST),
    
    // Verificaciones de roles
    isAdmin: () => hasRole('admin'),
    isEditor: () => hasRole('editor'),
    isModerator: () => hasRole('moderator'),
    
    // Verificaciones combinadas
    isUserManager: () => 
      hasPermission(PERMISSIONS.USERS_LIST) && 
      hasPermission(PERMISSIONS.USERS_CREATE),
    
    isRoleManager: () => 
      hasPermission(PERMISSIONS.ROLES_LIST) && 
      hasPermission(PERMISSIONS.ROLES_CREATE),
      
    // Función genérica
    hasPermission,
    hasRole,
  };
};
