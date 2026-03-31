import { useAuthStore } from "../stores/authStore";

export const PERMISSIONS = {
  // Usuarios
  USERS_LIST: 'users.list',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_SHOW: 'users.show',

  // Roles
  ROLES_LIST: 'roles.list',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',
  ROLES_SHOW: 'roles.show',

  // Permisos
  PERMISSIONS_LIST: 'permissions.list',
  PERMISSIONS_CREATE: 'permissions.create',
  PERMISSIONS_UPDATE: 'permissions.update',
  PERMISSIONS_DELETE: 'permissions.delete',

  // Agencias
  AGENCIES_LIST: 'agencies.list',
  AGENCIES_CREATE: 'agencies.create',
  AGENCIES_UPDATE: 'agencies.update',
  AGENCIES_DELETE: 'agencies.delete',

  // Dashboard
  DASHBOARD_VIEW: 'dashboard.view',
  
  // Configuración
  SETTINGS_UPDATE: 'settings.update',
} as const;

export type PermissionType = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Función helper para verificar múltiples permisos
export const hasAnyPermission = (userPermissions: string[], requiredPermissions: string[]): boolean => {
  return requiredPermissions.some(permission => userPermissions.includes(permission));
};

// Función helper para verificar todos los permisos
export const hasAllPermissions = (userPermissions: string[], requiredPermissions: string[]): boolean => {
  return requiredPermissions.every(permission => userPermissions.includes(permission));
};

// Grupos de permisos comunes
export const PERMISSION_GROUPS = {
  USER_MANAGEMENT: [
    PERMISSIONS.USERS_LIST,
    PERMISSIONS.USERS_CREATE,
    PERMISSIONS.USERS_UPDATE,
    PERMISSIONS.USERS_DELETE,
  ],
  ROLE_MANAGEMENT: [
    PERMISSIONS.ROLES_LIST,
    PERMISSIONS.ROLES_CREATE,
    PERMISSIONS.ROLES_UPDATE,
    PERMISSIONS.ROLES_DELETE,
  ],
  ADMIN_ACCESS: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.USERS_LIST,
    PERMISSIONS.ROLES_LIST,
  ],
};

// Hook personalizado para verificar múltiples permisos
export const usePermissions = () => {
  const { hasPermission } = useAuthStore();

  return {
    hasPermission,
    hasAnyPermission: (permissions: string[]) => 
      hasAnyPermission(useAuthStore.getState().permissions, permissions),
    hasAllPermissions: (permissions: string[]) =>
      hasAllPermissions(useAuthStore.getState().permissions, permissions),
  };
};
